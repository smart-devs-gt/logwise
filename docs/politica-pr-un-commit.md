# Política de Pull Request: Un solo commit

Para mantener un historial limpio y facilitar la revisión de cambios, todos los Pull Requests que se integren a la rama `develop` deben contener **solo un commit**.

## ¿Qué ocurre si hay más de un commit?
- El workflow de CI bloqueará el PR y mostrará el siguiente mensaje:
  > ERROR: El Pull Request a develop debe tener solo un commit. Usa git commit --amend y git push --force.


## ¿Qué hacer si tu PR fue rechazado por tener más de un commit?

Si ya enviaste un PR con dos o más commits y el workflow lo rechazó:

1. **Haz un squash de los commits en tu rama local:**
  ```bash
  git checkout <tu-rama>
  git rebase -i develop
  # En el editor, marca todos los commits menos el primero como "squash" o "fixup"
  # Guarda y cierra el editor
  # Si es necesario, resuelve conflictos y continúa el rebase
  git push --force
  ```
2. **Verifica que solo queda un commit en tu rama:**
  ```bash
  git log --oneline
  ```
3. **El workflow de CI ahora permitirá el merge.**

> Si tienes dudas sobre el proceso de squash interactivo, consulta al equipo o revisa la documentación oficial de Git.

## Ejemplo de flujo
- Crea tu rama feature/fix/hotfix desde develop.
- Haz tus cambios y crea el PR.
- Si el workflow falla por más de un commit, sigue los pasos anteriores.

## Beneficios
- Historial más limpio y fácil de auditar.
- Revisión de cambios más sencilla.
- Menos conflictos al integrar ramas.

---
Para dudas o ayuda, consulta al equipo de desarrollo o revisa la documentación interna.
