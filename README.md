# Fotos de eventos — frontend

React 19, TypeScript e Vite, API na mesma origem `/api`. Interface em português, com painel do fotógrafo e página do participante. Identidade visual provisória, sem marca comercial aprovada.

## Executar

Com o backend local em execução, na pasta `frontend/`:

```sh
npm ci
npm run dev
```

Abra `http://127.0.0.1:5178`. O proxy Vite encaminha `/api` para `http://127.0.0.1:8008`. Nenhuma variável `VITE_API_URL` ou credencial AWS é necessária.

`npm run build` verifica tipos e gera `dist/`. `npm run typecheck` verifica apenas TypeScript.

## Publicar na AWS

Secrets `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`. Push na `main` publica o ambiente `dev`: o workflow lê bucket e distribuição dos outputs da stack `fotos-eventos-dev-hosting` (esperando o backend criá-la, se preciso). **Run workflow** manual serve para outro stage. Nenhum `VITE_*` ou secret entra no bundle; a API é `/api` na mesma origem. Guia completo no backend: `docs/infra/aws.md`.

## Jornada implementada

Abrir painel local → criar evento e informar preço → enviar JPGs → publicar → abrir galeria → selecionar fotos → conferir cotação no servidor → informar e-mail e gerar cobrança Pix (quando houver provedor) → acompanhar o pedido em `/pedido/<id>#k=…` → baixar originais após confirmação no servidor. `/pedido` recupera o acesso por e-mail quando houver remetente. O painel lista pedidos por evento com resumo e reconsulta. A galeria geral depende da permissão explícita do fotógrafo. Busca por selfie aparece como indisponível.

No ambiente local não há provedor Pix nem remetente: a interface informa isso e não simula QR, pagamento ou e-mail. A seleção é temporária na página; eventos, fotos e pedidos persistem no backend.

A fonte de regras está no [backend irmão](../backend/docs/specs/mvp/spec.md). Contratos e critérios não devem ser duplicados no frontend. Este link pressupõe a organização local `frontend/` e `backend/` no mesmo workspace; atualizar para o endereço GitHub após a criação dos repos.
