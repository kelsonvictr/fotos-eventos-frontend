"""Publica o build no bucket do site depois de conferir os outputs da stack; nunca imprime credenciais."""

import json
import os
import subprocess
import time
from pathlib import Path


def aws(*args):
    return subprocess.check_output(["aws", *args], text=True)


region = os.environ.get("AWS_REGION", "").strip() or "us-east-2"
stage = os.environ.get("DEPLOY_STAGE", "").strip() or "dev"
stack_name = f"fotos-eventos-{stage}-hosting"


def stack_outputs():
    """Wait while the backend workflow is still creating/updating the hosting stack."""
    deadline = time.time() + 50 * 60
    while True:
        result = subprocess.run(
            ["aws", "cloudformation", "describe-stacks", "--region", region, "--stack-name", stack_name,
             "--query", "Stacks[0]", "--output", "json"],
            capture_output=True, text=True,
        )
        if result.returncode != 0 and "does not exist" not in result.stderr:
            # Credentials/permissions problems must fail now, not after waiting.
            raise SystemExit("Falha ao consultar o CloudFormation: " + result.stderr.strip()[-300:])
        stack = json.loads(result.stdout) if result.returncode == 0 else None
        status = stack["StackStatus"] if stack else "AUSENTE"
        if status in ("CREATE_COMPLETE", "UPDATE_COMPLETE", "UPDATE_ROLLBACK_COMPLETE"):
            return {o["OutputKey"]: o["OutputValue"] for o in stack.get("Outputs", [])}
        if status.endswith("FAILED") or status in ("ROLLBACK_COMPLETE", "DELETE_COMPLETE"):
            raise SystemExit(f"Stack {stack_name} em {status}; corrija o deploy do backend. Nada publicado.")
        if time.time() > deadline:
            raise SystemExit(f"Stack {stack_name} não ficou pronta ({status}); nada publicado.")
        print(f"Aguardando {stack_name} ({status}) ser criada pelo deploy do backend...", flush=True)
        time.sleep(30)


outputs = stack_outputs()
bucket, distribution = outputs["SiteBucket"], outputs["DistributionId"]
# Variables antigas, se existirem, precisam apontar para a mesma stack.
for name, expected in (("SITE_BUCKET", bucket), ("DISTRIBUTION", distribution)):
    configured = os.environ.get(name, "").strip()
    if configured and configured != expected:
        raise SystemExit(f"{name} configurado diferente do output da stack {stack_name}; nada publicado.")
# Assets do Vite têm hash: cache longo e versões anteriores preservadas para abas abertas.
aws("s3", "sync", "dist/assets/", f"s3://{bucket}/assets/", "--cache-control", "public,max-age=31536000,immutable")
aws(
    "s3", "cp", "dist/", f"s3://{bucket}/", "--recursive", "--exclude", "assets/*", "--exclude", "index.html",
    "--cache-control", "public,max-age=300,must-revalidate",
)
aws(
    "s3", "cp", "dist/index.html", f"s3://{bucket}/index.html",
    "--cache-control", "no-cache", "--content-type", "text/html; charset=utf-8",
)
invalidation = json.loads(
    aws("cloudfront", "create-invalidation", "--distribution-id", distribution, "--paths", "/*", "--output", "json")
)["Invalidation"]["Id"]
release = {
    "commit": os.environ["GITHUB_SHA"],
    "stage": stage,
    "region": region,
    "bucket": bucket,
    "distribution": distribution,
    "url": outputs["SiteUrl"],
    "invalidation": invalidation,
}
Path("release.json").write_text(json.dumps(release, indent=2) + "\n")
print(f"Frontend enviado para {outputs['SiteUrl']}; aguardando invalidação.", flush=True)
aws("cloudfront", "wait", "invalidation-completed", "--distribution-id", distribution, "--id", invalidation)
with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as stream:
    stream.write(f"Frontend publicado: {outputs['SiteUrl']}\n\nCommit: `{release['commit']}`\n")
print("Publicação e invalidação concluídas.", flush=True)
