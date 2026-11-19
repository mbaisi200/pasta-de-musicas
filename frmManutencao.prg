********************************************************************************
*  Formulário: Manutenção de Músicas
*  Solicitações atendidas:
*   1. Combo Instrumento/Tipo abre com seta E com digitação
*   2. Campo Ordem não deixa "0" na frente ao digitar sobre o zero
*   3. Observações cadastradas aqui são exibidas na tela de Músicas aberta
********************************************************************************
PARAMETER lcModo, lnRecNo

LOCAL loForm
LOCAL lcOldOrdem

DO CASE
    CASE lcModo = 'NOVO'
        INSERT INTO músicas BLANK
        lnRecNo = RECNO()
    CASE lcModo = 'EDITAR'
        IF lnRecNo > 0
            GOTO RECORD lnRecNo IN músicas
        ENDIF
ENDCASE

lcOldOrdem = ALLTRIM(STR(músicas.ORDEM))

* Formulário
loForm = CREATEOBJECT('Form')
loForm.AutoCenter = .T.
loForm.Caption = 'Manutenção de Música'
loForm.Width = 640
loForm.Height = 560
loForm.WindowStyle = 1 && Dialog

* ---------------------------------------------------------------------------
* Nome da música
* ---------------------------------------------------------------------------
loForm.AddObject('lblMusica', 'Label')
WITH loForm.lblMusica
    .Left = 20 ; .Top = 22 ; .Width = 110 ; .Height = 20
    .Caption = 'Nome da música:'
ENDWITH

loForm.AddObject('txtMusica', 'TextBox')
WITH loForm.txtMusica
    .Left = 140 ; .Top = 20 ; .Width = 470 ; .Height = 28
    .ControlSource = 'músicas.MÚSICA'
    .TabIndex = 1
ENDWITH

* ---------------------------------------------------------------------------
* Autor
* ---------------------------------------------------------------------------
loForm.AddObject('lblAutor', 'Label')
WITH loForm.lblAutor
    .Left = 20 ; .Top = 60 ; .Width = 110 ; .Height = 20
    .Caption = 'Autor(es):'
ENDWITH

loForm.AddObject('txtAutor', 'TextBox')
WITH loForm.txtAutor
    .Left = 140 ; .Top = 58 ; .Width = 470 ; .Height = 28
    .ControlSource = 'músicas.AUTOR'
    .TabIndex = 2
ENDWITH

* ---------------------------------------------------------------------------
* Grupo / Estilo
* ---------------------------------------------------------------------------
loForm.AddObject('lblGrupo', 'Label')
WITH loForm.lblGrupo
    .Left = 20 ; .Top = 100 ; .Width = 110 ; .Height = 20
    .Caption = 'Grupo/Repertório:'
ENDWITH

loForm.AddObject('txtGrupo', 'TextBox')
WITH loForm.txtGrupo
    .Left = 140 ; .Top = 98 ; .Width = 220 ; .Height = 28
    .ControlSource = 'músicas.GRUPO'
    .TabIndex = 3
ENDWITH

loForm.AddObject('lblEstilo', 'Label')
WITH loForm.lblEstilo
    .Left = 370 ; .Top = 100 ; .Width = 60 ; .Height = 20
    .Caption = 'Estilo:'
ENDWITH

loForm.AddObject('txtEstilo', 'TextBox')
WITH loForm.txtEstilo
    .Left = 430 ; .Top = 98 ; .Width = 180 ; .Height = 28
    .ControlSource = 'músicas.ESTILO'
    .TabIndex = 4
ENDWITH

* ---------------------------------------------------------------------------
* Instrumento / Tipo  (Solicitação 1: seta + digitação)
* ---------------------------------------------------------------------------
loForm.AddObject('lblInstrumento', 'Label')
WITH loForm.lblInstrumento
    .Left = 20 ; .Top = 140 ; .Width = 120 ; .Height = 20
    .Caption = 'Instrumento/Tipo:'
ENDWITH

loForm.AddObject('cmbInstrumento', 'ComboBox')
WITH loForm.cmbInstrumento
    .Left = 140 ; .Top = 138 ; .Width = 470 ; .Height = 28
    .Style = 2 && Dropdown: permite digitar E abrir lista com a seta
    .RowSourceType = 1 && Alias
    .RowSource = 'músicas'
    .ColumnCount = 1
    .BoundColumn = 1
    .ControlSource = 'músicas.INSTRUMENT'
    .TabIndex = 5
ENDWITH

* ---------------------------------------------------------------------------
* Ordem  (Solicitação 2: não deixa zero na frente)
* ---------------------------------------------------------------------------
loForm.AddObject('lblOrdem', 'Label')
WITH loForm.lblOrdem
    .Left = 20 ; .Top = 180 ; .Width = 60 ; .Height = 20
    .Caption = 'Ordem:'
ENDWITH

loForm.AddObject('txtOrdem', 'TextBox')
WITH loForm.txtOrdem
    .Left = 140 ; .Top = 178 ; .Width = 80 ; .Height = 28
    .ControlSource = 'músicas.ORDEM'
    .InputMask = '99'
    .TabIndex = 6
    PROCEDURE GotFocus
        IF THIS.Value = 0 OR ALLTRIM(THIS.Text) = '0'
            THIS.Value = .NULL.
            THIS.Text = ''
        ENDIF
        dodefault()
    ENDPROC
    PROCEDURE InteractiveChange
        LOCAL lcTexto
        lcTexto = ALLTRIM(THIS.Text)
        lcTexto = STRCURR(lcTexto, 9)
        DO WHILE LEFT(lcTexto, 1) = '0' .AND. LEN(lcTexto) > 1
            lcTexto = SUBSTR(lcTexto, 2)
        ENDDO
        THIS.Text = lcTexto
        dodefault()
    ENDPROC
ENDWITH

* ---------------------------------------------------------------------------
* PDF / Caminho
* ---------------------------------------------------------------------------
loForm.AddObject('lblPdf', 'Label')
WITH loForm.lblPdf
    .Left = 20 ; .Top = 220 ; .Width = 110 ; .Height = 20
    .Caption = 'PDF / Arquivo:'
ENDWITH

loForm.AddObject('txtPdf', 'TextBox')
WITH loForm.txtPdf
    .Left = 140 ; .Top = 218 ; .Width = 470 ; .Height = 28
    .ControlSource = 'músicas.PDF'
    .TabIndex = 7
ENDWITH

* ---------------------------------------------------------------------------
* Observações  (Solicitação 3)
* ---------------------------------------------------------------------------
loForm.AddObject('lblObs', 'Label')
WITH loForm.lblObs
    .Left = 20 ; .Top = 260 ; .Width = 110 ; .Height = 20
    .Caption = 'Observações:'
ENDWITH

loForm.AddObject('txtObs', 'EditBox')
WITH loForm.txtObs
    .Left = 140 ; .Top = 258 ; .Width = 470 ; .Height = 80
    .ControlSource = 'músicas.OBSERVAÇÕE'
    .TabIndex = 8
ENDWITH

* ---------------------------------------------------------------------------
* Rolamento e Velocidade
* ---------------------------------------------------------------------------
loForm.AddObject('chkRolamento', 'CheckBox')
WITH loForm.chkRolamento
    .Left = 140 ; .Top = 350 ; .Width = 160 ; .Height = 24
    .Caption = 'Habilitar rolagem'
    .ControlSource = 'músicas.ROLAMENTO'
    .Value = .T.
    .TabIndex = 9
ENDWITH

loForm.AddObject('lblVel', 'Label')
WITH loForm.lblVel
    .Left = 320 ; .Top = 354 ; .Width = 110 ; .Height = 20
    .Caption = 'Velocidade (1-9):'
ENDWITH

loForm.AddObject('spinVelocidade', 'Spinner')
WITH loForm.spinVelocidade
    .Left = 430 ; .Top = 348 ; .Width = 80 ; .Height = 28
    .ControlSource = 'músicas.VELOCIDADE'
    .Min = 1 ; .Max = 9 ; .Value = 1
    .TabIndex = 10
ENDWITH

* ---------------------------------------------------------------------------
* Botões
* ---------------------------------------------------------------------------
loForm.AddObject('cmdSalvar', 'CommandButton')
WITH loForm.cmdSalvar
    .Left = 200 ; .Top = 400 ; .Width = 100 ; .Height = 34
    .Caption = 'Salvar'
    .Default = .T.
    PROCEDURE Click
        LOCAL lcOrdem
        lcOrdem = ALLTRIM(THISFORM.txtOrdem.Text)
        IF lcOrdem = ''
            lcOrdem = '0'
        ENDIF
        REPLACE músicas.ORDEM WITH VAL(lcOrdem) IN músicas
        REPLACE músicas.INSTRUMENT WITH THISFORM.cmbInstrumento.Value IN músicas
        TABLEUPDATE(1, .T., 'músicas')
        THISFORM.Release()
    ENDPROC
ENDWITH

loForm.AddObject('cmdFechar', 'CommandButton')
WITH loForm.cmdFechar
    .Left = 310 ; .Top = 400 ; .Width = 100 ; .Height = 34
    .Caption = 'Fechar'
    .Cancel = .T.
    PROCEDURE Click
        THISFORM.Release()
    ENDPROC
ENDWITH

loForm.AddObject('cmdExcluir', 'CommandButton')
WITH loForm.cmdExcluir
    .Left = 420 ; .Top = 400 ; .Width = 100 ; .Height = 34
    .Caption = 'Excluir'
    PROCEDURE Click
        IF MESSAGEBOX('Deseja excluir esta música?', 36, 'Excluir') = 6
            DELETE IN músicas
            PACK IN músicas
            THISFORM.Release()
        ENDIF
    ENDPROC
ENDWITH

loForm.ShowModal()

ENDPROC