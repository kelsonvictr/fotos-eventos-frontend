"""Publica o build no bucket do site depois de conferir os outputs da stack; nunca imprime credenciais."""

import json
import os
import subprocess
from pathlib import Path


def aws(*args):
    return subprocess.check_output(["aws", *args], text=True)


bucket = os.environ["SITE_BUCKET"].strip()
distribution = os.environ["DISTRIBUTION"].strip()
region = os.environ["AWS_REGION"].strip()
stage = os.environ.get("DEPLOY_STAGE", "dev").strip()
if not bucket or not distribution or not region:
    raise SystemExit(
        "Cadastre as Variables AWS_REGION, AWS_S3_BUCKET e CLOUDFRONT_DISTRIBUTION_ID "
        "com os valores do resumo da Action do backend; nada foi publicado."
    )
stack = json.loads(
    aws(
        "cloudformation", "describe-stacks", "--region", region,
        "--stack-name", f"fotos-eventos-{stage}-hosting", "--query", "Stacks[0].Outputs", "--output", "json",
    )
)
outputs = {entry["OutputKey"]: entry["OutputValue"] for entry in stack}
if outputs["SiteBucket"] != bucket or outputs["DistributionId"] != distribution:
    raise SystemExit("Variables do frontend não correspondem à stack de hospedagem; nenhum arquivo publicado.")
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
