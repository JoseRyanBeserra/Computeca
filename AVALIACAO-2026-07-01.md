# Avaliação — EQ15 (DSC)

**Data:** 2026-07-01  
**Avaliador:** Prof. Rodrigo  
**Método:** verificação automática cruzando o que o `README.md` declara com evidências no código-fonte (leitura de `origin/main`).

> Esta é uma avaliação automática preliminar. O que não estiver documentado no README e commitado no repositório é considerado não atendido.

---

## 1. Log de Auditoria

✅ **Atendido** — documentado no README e com 95 evidência(s) no código.

---

## 2. Integração com Serviço Externo

- ✅ **OpenAI** — declarado no README e comprovado no código (35 ocorrência(s)).
  - Evidência: `MI-server/src/@types/resources/materials/pdf/index.ts:39:/** Uso de tokens OpenAI registrado por operação para observabilidade de custos */`
- ✅ **Object Storage (S3/MinIO)** — declarado no README e comprovado no código (64 ocorrência(s)).
  - Evidência: `MI-server/docker-compose.yml:7:# Console MinIO:     http://localhost:9001  (minioadmin / minioadmin)`
- ✅ **Qdrant** — declarado no README e comprovado no código (82 ocorrência(s)).
  - Evidência: `MI-server/docker-compose.yml:67:  # ── Qdrant (banco de vetores para RAG) ─────────────────────────────────────`

_Detectado no código, mas **não documentado** no README (não pontua até ser descrito):_
- ℹ️ SMTP / e-mail

---

## 3. Cobertura de Testes (≥ 85%)

✅ **Atendido** — backend linhas 86.56% (JS); frontend linhas 87.14% (JS) (relatório em `cobertura/`, 271 arquivo(s)).

> Critério: **cobertura de linhas** ≥ 85% (conforme a orientação). As demais métricas (instruções/ramos) são informativas.

> Observação: a cobertura é lida do relatório commitado pela equipe; não é recalculada nesta avaliação.

---

*Avaliação gerada automaticamente em 2026-07-01. Consulte `ORIENTACOES-AVALIACAO-2026-06-29.md` para os critérios.*