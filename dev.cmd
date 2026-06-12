@echo off
:: Script de arranque local para HOTCLICK
:: Incluye el fix de SSL para Windows (PKIX path building failed con Gemini/Anthropic)
cd /d "%~dp0Hot_click_outlet"
..\\maven\\bin\\mvn.cmd clean spring-boot:run ^
  -Dspring-boot.run.profiles=local ^
  "-Dspring-boot.run.jvmArguments=-Djavax.net.ssl.trustStoreType=Windows-ROOT"
