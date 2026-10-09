# Frontend — estado atual

09/10/2026: busca por selfie na página do evento (consentimento, câmera ou arquivo, redução da imagem no navegador, resultados selecionáveis mesmo com galeria fechada), opção "Busca por selfie" no formulário do evento e painel de indexação no admin. Pix aparece como "em breve".

08/10/2026, publicação AWS preparada: no modo AWS o painel pede o e-mail do fotógrafo e depois o código de 6 dígitos enviado por e-mail, a faixa superior indica ambiente de testes, fotos vão direto ao S3 por URL assinada e prévias de pedido sem permissão aparecem como ícone. Workflow **Publicar frontend** e `scripts/publish.py` conferem bucket e distribuição contra a stack `fotos-eventos-<stage>-hosting`. Ainda não publicado.

08/10/2026. Interface conectada à API real do backend: painel, criação/edição de eventos, envio de JPGs, publicação, galeria, ampliação, seleção, cotação e, neste segundo incremento, checkout com e-mail, página do pedido (`/pedido/<id>#k=…`), recuperação por e-mail (`/pedido`) e seção de pedidos no painel com resumo e reconsulta. Build TypeScript/Vite aprovado. Desktop e páginas de pedido a 375 px verificadas no navegador embutido, sem erros de console nem overflow.

A interface segue as capacidades informadas por `/api/health`: sem provedor Pix, a conferência da seleção mostra que o pagamento está em preparação e não exibe formulário; sem remetente, a recuperação informa que o envio de e-mail não está habilitado. Nenhum QR, cobrança ou pagamento é simulado. A chave do pedido fica no fragmento da URL e vai à API apenas no cabeçalho `X-Order-Key`. Downloads usam links temporários emitidos pelo servidor para pedidos pagos.

Marca provisória Fotos de eventos. Tema claro com verde suave, layout responsivo, estados vazios, falhas de upload e aviso de ambiente local. Fontes empacotadas localmente.

Não há busca facial. Pedido, pagamento e e-mail dependem dos adaptadores do provedor e do remetente escolhidos; a verificação visual das páginas de pedido usou dados sintéticos semeados fora de `backend/.local/`. Sessão local é exclusiva do servidor de desenvolvimento; a Lambda ainda não serve os contratos da aplicação.

Spec canônica no backend irmão: `../backend/docs/specs/mvp/spec.md`. Repositório `kelsonvictr/fotos-eventos-frontend`; CI em push e publicação manual.
