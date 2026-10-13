# Lvl Up Acumulativo 2.0 — configuração LivePix

Esta pasta contém a base do backend. **Ela não entra em funcionamento só por estar no GitHub**: a migração SQL precisa ser aplicada no Supabase, a Edge Function precisa ser publicada e o webhook precisa ser cadastrado no LivePix.

## Regras que esta base implementa

- Considera apenas pagamentos confirmados recebidos pelo webhook do LivePix.
- Confere o ID do pagamento consultando a API oficial LivePix antes de creditar.
- Usa o ID do pagamento como chave única, para que reenvios do webhook não dupliquem o valor.
- A primeira doação inicia uma janela fixa de 15 minutos; as seguintes somam ao total sem reiniciar a janela.
- Faixas do total coletivo: R$ 1,00 = VIP; R$ 5,00 = ELITE; R$ 20,00 = FÚRIA; R$ 50,00 = APOCALIPSE.
- Cada nível recém-desbloqueado acrescenta 300 segundos.
- Ao terminar o timer, a base reduz um nível por etapa; o término da janela encerra a rodada e volta ao SUAVE.

## 1. Aplicar a migração

No projeto Supabase usado pela Soundboard, aplique:

`supabase/migrations/202610130001_lvl_up_acumulativo.sql`

Pode ser via Supabase CLI (`supabase db push`) ou pelo SQL Editor do painel. Faça isso no projeto correto: o painel e o OBS usam o mesmo projeto Supabase existente.

## 2. Configurar secrets no Supabase

Crie uma aplicação OAuth no painel do LivePix e obtenha o Client ID e Client Secret. O webhook usa a API oficial `https://api.livepix.gg/v2` e precisa de permissão para consultar pagamentos recebidos (`wallet:read`).

Configure estes secrets na Edge Function; não os coloque no GitHub, no JavaScript do navegador ou no chat:

- `LIVEPIX_CLIENT_ID` — Client ID da aplicação LivePix.
- `LIVEPIX_CLIENT_SECRET` — segredo OAuth da aplicação.
- `LIVEPIX_USER_ID` — ID da conta LivePix que aparece no payload de webhook.
- `LIVEPIX_WEBHOOK_SECRET` — segredo aleatório forte escolhido para proteger a URL do webhook.
- `SOUNDBOARD_ROOM_ID` — `xguiler-soundboard-caos-control`.

O Supabase fornece `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente da Edge Function. Nunca exponha a service-role key no site.

## 3. Publicar a Edge Function

Com o Supabase CLI ligado ao projeto correto:

```bash
supabase secrets set LIVEPIX_CLIENT_ID="..." LIVEPIX_CLIENT_SECRET="..." LIVEPIX_USER_ID="..." LIVEPIX_WEBHOOK_SECRET="..." SOUNDBOARD_ROOM_ID="xguiler-soundboard-caos-control"
supabase functions deploy livepix-webhook --no-verify-jwt
```

A função exige o segredo na query string, como uma proteção extra para o endpoint público. O formato da URL será:

`https://SEU-PROJETO.supabase.co/functions/v1/livepix-webhook?key=SEU_LIVEPIX_WEBHOOK_SECRET`

Substitua os dois valores pelo project ref e segredo reais. Não publique essa URL com o segredo em canais públicos.

## 4. Cadastrar o webhook no LivePix

Cadastre a URL completa acima como webhook de pagamentos recebidos na conta LivePix correta. O payload documentado do LivePix.gg usa `event: "new"` e `resource.type: "payment"`. A função consulta `GET /v2/payments/{id}` antes de processar a doação.

## 5. Teste antes de usar em live

1. Envie uma doação de teste pequena.
2. Confirme que aparece uma única linha em `soundboard_lvlup_donations`.
3. Reenvie o webhook no painel LivePix e confirme que o total não duplica.
4. Teste as faixas de R$ 1, R$ 5, R$ 20 e R$ 50, além do fim da janela e do timer.
5. Só então habilite a integração no overlay e no painel.

**Importante:** esta entrega prepara a camada de backend. A ligação final do estado ao JavaScript do OBS/painel e o teste real dependem da publicação da função e das credenciais configuradas no seu Supabase/LivePix. Não compartilhe os segredos; configure-os diretamente no painel do Supabase.
