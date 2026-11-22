# Chicly (ex-PrestaCI)

Avant de lire des fichiers, consulte d'abord `graphify-out/graph.json` (ou `graphify query "<question>"`) pour comprendre la structure et ne lire que le strict nécessaire. Après de gros changements, mets la carte à jour : `graphify . --update --code-only`.

## Règles du projet

- Le flux de paiement Wave (`wave-transactions.ts` → validation admin) est gelé : ne jamais le modifier.
- Abonnements : GeniusPay uniquement. L'ancien flux Wave manuel est masqué dans l'interface par `WAVE_MANUEL_ACTIF = false` (`frontend/src/lib/config.ts`) ; le code Wave reste intact.
- `NODE_ENV=production` est défini dans le shell : préfixer les commandes locales (tsc, tests, build, npm install) avec `NODE_ENV=development`.
- Les `_id` MongoDB sont des nombres (`Counter.getNextId()`), pas des ObjectId. L'utilisateur authentifié est `req.userId` (nombre), jamais `req.user.id`.
- `Notification.type` a un enum strict : toute nouvelle valeur doit être ajoutée à l'enum du modèle avant usage.
