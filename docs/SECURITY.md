# Security and Privacy Checklist

- [ ] `server/.env` is ignored by Git.
- [ ] No Qloo or LLM secrets in frontend files, `VITE_` variables, public commits, screenshots, logs, demo recordings, or README.
- [ ] If a key was exposed, rotate it or ask the provider for a replacement.
- [ ] Validate request shape and text length on the server.
- [ ] Redact secrets from all error output and trace payloads.
- [ ] Use `execFile` with argument arrays rather than building shell strings if a CLI subprocess is needed.
- [ ] Never pass untrusted user text as a shell command.
- [ ] Do not send the full pasted text to Qloo when entity names suffice.
- [ ] Do not send personal or sensitive data to Qloo.
- [ ] Apply request limits and bounded concurrency.
- [ ] Do not bulk scrape or exceed event quotas.
- [ ] Avoid persistent storage of user text unless essential and explicitly explained.
- [ ] Keep error messages useful but non-sensitive.
- [ ] Run a secret scan before publishing.
- [ ] Check Git history if a credential was ever committed; rotating the key is still necessary even if the commit is removed.
