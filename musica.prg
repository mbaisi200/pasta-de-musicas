********************************************************************************
*  Pasta de Músicas - Aplicativo Visual FoxPro
*  Mantém a mesma estrutura de banco de dados existente (músicas.DBF)
*  Implementa todas as solicitações de 19/11/2026
********************************************************************************
SET PROCEDURE TO frmManutencao.prg ADDITIVE
SET PROCEDURE TO frmMusicas.prg ADDITIVE

SET EXCLUSIVE OFF
SET AUTOINC ON
SET TALK OFF
SET DELETED ON
SET EXACT OFF

* Abre o banco de dados existente
IF NOT FILE('músicas.dbc')
    CREATE DATABASE músicas
ENDIF
OPEN DATABASE músicas

IF NOT FILE('músicas.dbf')
    * Cria tabela se não existir (mantém estrutura original)
    CREATE TABLE músicas (;
        MÚSICA C(50), ;
        AUTOR C(50), ;
        GRUPO C(20), ;
        ESTILO C(20), ;
        INSTRUMENT C(20), ;
        PDF C(100), ;
        ROLAMENTO L(1), ;
        VELOCIDADE N(1), ;
        OBSERVAÇÕE C(100), ;
        ORDEM N(2)
    )
ENDIF

USE músicas IN 0 ALIAS músicas INDEX músicas

* Variável pública para lembrar a posição ao voltar
PUBLIC gnRegAtual
gnRegAtual = 1

* Menu principal
DO MENU

RETURN

PROCEDURE MENU
    DEFINE BARRA menuPrincipal
        BARRA menuPrincipal PROMPT 'Músicas'    ;
            ON MENU DO frmMusicas
        BARRA menuPrincipal PROMPT 'Manutenção' ;
            ON MENU DO frmManutencao
        BARRA menuPrincipal PROMPT 'Sair'       ;
            ON MENU QUIT
    ACTIVATE BARRA menuPrincipal
ENDPROC

PROCEDURE QUIT
    CLOSE DATABASES
    QUIT
ENDPROC