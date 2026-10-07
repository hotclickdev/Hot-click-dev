# Hotspots de seguridad

Instrucción obligatoria. Se enfoca en sitios sospechosos que todavía no son un fallo. Una persona los marca como seguros o como un problema. No se deja un hotspot nuevo sin revisar.

Si no queda claro qué es un hotspot, leer https://docs.sonarsource.com/sonarqube-cloud/digging-deeper/security-hotspots/ antes de seguir.

Verde: revisión en **A** y cero hotspots sin revisar. A significa que al menos el 80 % ya fue revisado. En este proyecto el objetivo es cero pendientes.

No se cierran solos con un commit. Si aparece uno, se revisa en SonarCloud y se deja constancia de por qué es seguro o se corrige el código.
