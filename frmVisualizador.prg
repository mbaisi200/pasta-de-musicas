********************************************************************************
*  Formulário: Visualizador de Música Aberta
*  Solicitações atendidas:
*   3. Observações visíveis na música aberta (rodapé)
*   4. Voltar na mesma música (usa gnRegAtual)
*   6. Duas páginas vs rolagem contínua (gbModoDual)
*   7. Cursor karaokê - linha vertical vermelha percorrendo a partitura
********************************************************************************
PARAMETER lnRecNo

LOCAL loForm

PUBLIC gnRegAtual
PUBLIC gbModoDual

IF VARTYPE(lnRecNo) = 'N' .AND. lnRecNo > 0
    gnRegAtual = lnRecNo
ENDIF

IF gnRegAtual > 0
    GOTO RECORD gnRegAtual IN músicas
ENDIF

loForm = CREATEOBJECT('Form')
loForm.AutoCenter = .T.
loForm.Caption = 'Visualizando: ' + ALLTRIM(músicas.MÚSICA)
loForm.Width = 1024
loForm.Height = 768
loForm.WindowStyle = 0

* Cabeçalho
loForm.AddObject('lblNome', 'Label')
WITH loForm.lblNome
    .Left = 10 ; .Top = 10 ; .Width = 900 ; .Height = 28
    .Caption = ALLTRIM(músicas.MÚSICA)
    .FontSize = 16 ; .FontBold = .T.
ENDWITH

loForm.AddObject('lblAutor', 'Label')
WITH loForm.lblAutor
    .Left = 10 ; .Top = 40 ; .Width = 900 ; .Height = 20
    .Caption = 'Autor: ' + ALLTRIM(músicas.AUTOR) + '   |   Estilo: ' + ALLTRIM(músicas.ESTILO) + '   |   Instrumento: ' + ALLTRIM(músicas.INSTRUMENT)
ENDWITH

loForm.AddObject('lblOrdem', 'Label')
WITH loForm.lblOrdem
    .Left = 10 ; .Top = 62 ; .Width = 200 ; .Height = 20
    .Caption = 'Ordem: ' + ALLTRIM(STR(músicas.ORDEM)) + '   |   Rolamento: ' + IIF(músicas.ROLAMENTO, 'Sim', 'Não') + '   |   Velocidade: ' + ALLTRIM(STR(músicas.VELOCIDADE))
ENDWITH

* Container do PDF
loForm.AddObject('containerPDF', 'Container')
WITH loForm.containerPDF
    .Left = 10 ; .Top = 95 ; .Width = loForm.Width - 20 ; .Height = 500
    .Anchor = 15
    .BackColor = RGB(240, 240, 240)

    .AddObject('framePDF', 'OLEControl')
    WITH .framePDF
        .Left = 0 ; .Top = 0 ; .Width = .Parent.Width ; .Height = .Parent.Height
        .Anchor = 15
        .OLEClass = 'AcroPDF.PDF.1'
        .Visible = .F.
    ENDWITH

    .AddObject('imgPDF', 'Image')
    WITH .imgPDF
        .Left = 0 ; .Top = 0 ; .Width = .Parent.Width ; .Height = .Parent.Height
        .Anchor = 15
        .Stretch = 2
        .Visible = .T.
        .Picture = ''
    ENDWITH

    .AddObject('shapeKaraoke', 'Shape')
    WITH .shapeKaraoke
        .Left = 0 ; .Top = 0 ; .Width = 4 ; .Height = .Parent.Height
        .BackColor = RGB(255, 0, 0)
        .BorderStyle = 0
        .Visible = .F.
        .Anchor = 5
    ENDWITH
ENDWITH

* Timer karaokê
loForm.AddObject('timerKaraoke', 'Timer')
WITH loForm.timerKaraoke
    .Interval = 100
    .Enabled = .F.
    PROCEDURE Timer
        LOCAL lnLargura
        lnLargura = THISFORM.containerPDF.Width - 20
        IF VARTYPE(THISFORM.nPosKaraoke) <> 'N'
            THISFORM.nPosKaraoke = 0
        ENDIF
        THISFORM.nPosKaraoke = THISFORM.nPosKaraoke + 5
        IF THISFORM.nPosKaraoke > lnLargura
            THISFORM.nPosKaraoke = 0
        ENDIF
        THISFORM.containerPDF.shapeKaraoke.Left = THISFORM.nPosKaraoke
    ENDPROC
ENDWITH

* Rodapé Observações
loForm.AddObject('containerObs', 'Container')
WITH loForm.containerObs
    .Left = 10 ; .Top = 605 ; .Width = loForm.Width - 20 ; .Height = 100
    .Anchor = 15
    .BackColor = RGB(255, 240, 240)
    .BorderStyle = 1

    .AddObject('lblObsTitulo', 'Label')
    WITH .lblObsTitulo
        .Left = 10 ; .Top = 8 ; .Width = 120 ; .Height = 20
        .Caption = 'Observações:'
        .FontBold = .T.
    ENDWITH

    .AddObject('lblObsTexto', 'Label')
    WITH .lblObsTexto
        .Left = 140 ; .Top = 8 ; .Width = .Parent.Width - 160 ; .Height = 80
        .Caption = IIF(EMPTY(ALLTRIM(músicas.OBSERVAÇÕE)), 'Sem observações cadastradas.', ALLTRIM(músicas.OBSERVAÇÕE))
        .WordWrap = .T.
        .AutoSize = .F.
    ENDWITH
ENDWITH

IF EMPTY(ALLTRIM(músicas.OBSERVAÇÕE))
    loForm.containerObs.Visible = .F.
ENDIF

* Botões
loForm.AddObject('btnVoltar', 'CommandButton')
WITH loForm.btnVoltar
    .Left = 10 ; .Top = 715 ; .Width = 130 ; .Height = 34
    .Caption = 'Voltar à lista'
    PROCEDURE Click
        THISFORM.timerKaraoke.Enabled = .F.
        THISFORM.Release()
        IF gnRegAtual > 0
            GOTO RECORD gnRegAtual IN músicas
        ENDIF
    ENDPROC
ENDWITH

loForm.AddObject('btnDual', 'CommandButton')
WITH loForm.btnDual
    .Left = 150 ; .Top = 715 ; .Width = 130 ; .Height = 34
    .Caption = 'Modo: Duas Páginas'
    PROCEDURE Click
        gbModoDual = .NOT. gbModoDual
        IF gbModoDual
            THIS.Caption = 'Modo: Rolagem'
        ELSE
            THIS.Caption = 'Modo: Duas Páginas'
        ENDIF
    ENDPROC
ENDWITH

loForm.AddObject('btnKaraoke', 'CommandButton')
WITH loForm.btnKaraoke
    .Left = 290 ; .Top = 715 ; .Width = 130 ; .Height = 34
    .Caption = 'Iniciar Karaokê'
    PROCEDURE Click
        IF THISFORM.timerKaraoke.Enabled
            THISFORM.timerKaraoke.Enabled = .F.
            THISFORM.containerPDF.shapeKaraoke.Visible = .F.
            THIS.Caption = 'Iniciar Karaokê'
        ELSE
            THISFORM.nPosKaraoke = 0
            THISFORM.timerKaraoke.Enabled = .T.
            THISFORM.containerPDF.shapeKaraoke.Visible = .T.
            THIS.Caption = 'Pausar Karaokê'
        ENDIF
    ENDPROC
ENDWITH

loForm.AddObject('lblVel', 'Label')
WITH loForm.lblVel
    .Left = 430 ; .Top = 724 ; .Width = 80 ; .Height = 20
    .Caption = 'Velocidade:'
ENDWITH

loForm.AddObject('spinnerVel', 'Spinner')
WITH loForm.spinnerVel
    .Left = 510 ; .Top = 715 ; .Width = 80 ; .Height = 28
    .Min = 1 ; .Max = 9 ; .Value = IIF(VARTYPE(músicas.VELOCIDADE) = 'N', músicas.VELOCIDADE, 1)
    PROCEDURE Change
        LOCAL lnVel
        lnVel = THIS.Value
        THISFORM.timerKaraoke.Interval = IIF(lnVel > 0, 1000 / (lnVel * 10), 100)
    ENDPROC
ENDWITH

loForm.AddObject('cmdSair', 'CommandButton')
WITH loForm.cmdSair
    .Left = 880 ; .Top = 715 ; .Width = 100 ; .Height = 34
    .Caption = 'Sair'
    .Cancel = .T.
    PROCEDURE Click
        THISFORM.timerKaraoke.Enabled = .F.
        THISFORM.Release()
    ENDPROC
ENDWITH

* Carrega PDF se existir
IF NOT EMPTY(ALLTRIM(músicas.PDF)) .AND. FILE(ALLTRIM(músicas.PDF))
    loForm.containerPDF.framePDF.Visible = .T.
    loForm.containerPDF.framePDF.src = ALLTRIM(músicas.PDF)
    loForm.containerPDF.imgPDF.Visible = .F.
ELSE
    loForm.containerPDF.imgPDF.Visible = .T.
ENDIF

loForm.ShowModal()

ENDPROC