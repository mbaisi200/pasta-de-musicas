********************************************************************************
*  Formulário: Músicas - Lista, Navegação e Visualizador
*  Solicitações atendidas:
*   4. Voltar na mesma música (lembra posição ao voltar)
*   5. Filtros não somem em tela pequena/tablet
*   6. Duas páginas vs rolagem contínua
*   7. Cursor karaokê - linha vertical vermelha
*   3. Observações visíveis na música aberta (rodapé)
********************************************************************************
PARAMETER lcModoInicial

LOCAL loForm

PUBLIC gnRegAtual
PUBLIC gbModoDual
gbModoDual = .F.

* Formulário principal
loForm = CREATEOBJECT('Form')
loForm.AutoCenter = .T.
loForm.Caption = 'Pasta de Músicas'
loForm.Width = 980
loForm.Height = 700
loForm.WindowStyle = 0

* ---------------------------------------------------------------------------
* Container de filtros - Solicitação 5: nunca somem, mesmo em tela pequena
* ---------------------------------------------------------------------------
loForm.AddObject('containerFiltros', 'Container')
WITH loForm.containerFiltros
    .Left = 10 ; .Top = 10 ; .Width = loForm.Width - 20 ; .Height = 110
    .Anchor = 15

    .AddObject('lblFiltroMusica', 'Label')
    WITH .lblFiltroMusica
        .Left = 10 ; .Top = 10 ; .Width = 100 ; .Height = 20
        .Caption = 'Buscar música/autor:'
    ENDWITH

    .AddObject('txtFiltro', 'TextBox')
    WITH .txtFiltro
        .Left = 110 ; .Top = 8 ; .Width = 250 ; .Height = 26
        .TabIndex = 1
    ENDWITH

    .AddObject('lblFiltroInstrumento', 'Label')
    WITH .lblFiltroInstrumento
        .Left = 380 ; .Top = 10 ; .Width = 90 ; .Height = 20
        .Caption = 'Instrumento:'
    ENDWITH

    .AddObject('cmbFiltroInstrumento', 'ComboBox')
    WITH .cmbFiltroInstrumento
        .Left = 470 ; .Top = 8 ; .Width = 180 ; .Height = 26
        .Style = 2
        .RowSourceType = 1
        .RowSource = 'músicas'
        .TabIndex = 2
    ENDWITH

    .AddObject('lblFiltroEstilo', 'Label')
    WITH .lblFiltroEstilo
        .Left = 660 ; .Top = 10 ; .Width = 60 ; .Height = 20
        .Caption = 'Estilo:'
    ENDWITH

    .AddObject('cmbFiltroEstilo', 'ComboBox')
    WITH .cmbFiltroEstilo
        .Left = 720 ; .Top = 8 ; .Width = 160 ; .Height = 26
        .Style = 2
        .RowSourceType = 1
        .RowSource = 'músicas'
        .TabIndex = 3
    ENDWITH

    .AddObject('btnAplicarFiltro', 'CommandButton')
    WITH .btnAplicarFiltro
        .Left = 890 ; .Top = 8 ; .Width = 90 ; .Height = 26
        .Caption = 'Aplicar'
        PROCEDURE Click
            THISFORM.RefreshGrid()
        ENDPROC
    ENDWITH

    .AddObject('btnLimparFiltro', 'CommandButton')
    WITH .btnLimparFiltro
        .Left = 890 ; .Top = 40 ; .Width = 90 ; .Height = 26
        .Caption = 'Limpar'
        PROCEDURE Click
            THISFORM.txtFiltro.Value = ''
            THISFORM.cmbFiltroInstrumento.Value = .NULL.
            THISFORM.cmbFiltroEstilo.Value = .NULL.
            THISFORM.RefreshGrid()
        ENDPROC
    ENDWITH
ENDWITH

* ---------------------------------------------------------------------------
* Grid de músicas
* ---------------------------------------------------------------------------
loForm.AddObject('gridMusicas', 'Grid')
WITH loForm.gridMusicas
    .Left = 10 ; .Top = 130 ; .Width = loForm.Width - 20 ; .Height = 380
    .Anchor = 15
    .RecordSource = 'músicas'
    .ColumnCount = 1
    .AllowCellSelection = .T.
    .MultiSelect = .F.
    .ReadOnly = .T.

    WITH .AddObject('coluna1', 'Column')
        .Width = 200
        .Header1.Caption = 'Música'
        .ControlSource = 'músicas.MÚSICA'
    ENDWITH

    WITH .AddObject('coluna2', 'Column')
        .Width = 200
        .Header1.Caption = 'Autor'
        .ControlSource = 'músicas.AUTOR'
    ENDWITH

    WITH .AddObject('coluna3', 'Column')
        .Width = 120
        .Header1.Caption = 'Grupo'
        .ControlSource = 'músicas.GRUPO'
    ENDWITH

    WITH .AddObject('coluna4', 'Column')
        .Width = 120
        .Header1.Caption = 'Estilo'
        .ControlSource = 'músicas.ESTILO'
    ENDWITH

    WITH .AddObject('coluna5', 'Column')
        .Width = 150
        .Header1.Caption = 'Instrumento'
        .ControlSource = 'músicas.INSTRUMENT'
    ENDWITH

    WITH .AddObject('coluna6', 'Column')
        .Width = 80
        .Header1.Caption = 'Ordem'
        .ControlSource = 'músicas.ORDEM'
    ENDWITH

    WITH .AddObject('coluna7', 'Column')
        .Width = 100
        .Header1.Caption = 'Observações'
        .ControlSource = 'músicas.OBSERVAÇÕE'
    ENDWITH
ENDWITH

* ---------------------------------------------------------------------------
* Botões de ação
* ---------------------------------------------------------------------------
loForm.AddObject('cmdNovo', 'CommandButton')
WITH loForm.cmdNovo
    .Left = 10 ; .Top = 530 ; .Width = 110 ; .Height = 34
    .Caption = 'Novo'
    PROCEDURE Click
        DO frmManutencao.prg WITH 'NOVO', 0
        THISFORM.RefreshGrid()
    ENDPROC
ENDWITH

loForm.AddObject('cmdEditar', 'CommandButton')
WITH loForm.cmdEditar
    .Left = 130 ; .Top = 530 ; .Width = 110 ; .Height = 34
    .Caption = 'Editar'
    PROCEDURE Click
        IF RECNO() > 0
            DO frmManutencao.prg WITH 'EDITAR', RECNO()
            THISFORM.RefreshGrid()
        ENDIF
    ENDPROC
ENDWITH

loForm.AddObject('cmdExcluir', 'CommandButton')
WITH loForm.cmdExcluir
    .Left = 250 ; .Top = 530 ; .Width = 110 ; .Height = 34
    .Caption = 'Excluir'
    PROCEDURE Click
        IF RECNO() > 0
            IF MESSAGEBOX('Excluir esta música?', 36, 'Excluir') = 6
                DELETE IN músicas
                PACK IN músicas
                THISFORM.RefreshGrid()
            ENDIF
        ENDIF
    ENDPROC
ENDWITH

loForm.AddObject('cmdVisualizar', 'CommandButton')
WITH loForm.cmdVisualizar
    .Left = 370 ; .Top = 530 ; .Width = 130 ; .Height = 34
    .Caption = 'Visualizar Música'
    .Default = .T.
    PROCEDURE Click
        IF RECNO() > 0
            gnRegAtual = RECNO()
            DO frmVisualizador.prg
            THISFORM.RefreshGrid()
        ENDIF
    ENDPROC
ENDWITH

loForm.AddObject('cmdVoltar', 'CommandButton')
WITH loForm.cmdVoltar
    .Left = 510 ; .Top = 530 ; .Width = 110 ; .Height = 34
    .Caption = 'Voltar (mesma música)'
    PROCEDURE Click
        IF gnRegAtual > 0
            GOTO RECORD gnRegAtual IN músicas
            loForm.RefreshGrid()
            loForm.gridMusicas.SetFocus
        ENDIF
    ENDPROC
ENDWITH

loForm.AddObject('cmdModoDual', 'CommandButton')
WITH loForm.cmdModoDual
    .Left = 640 ; .Top = 530 ; .Width = 140 ; .Height = 34
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

loForm.AddObject('cmdSair', 'CommandButton')
WITH loForm.cmdSair
    .Left = 790 ; .Top = 530 ; .Width = 100 ; .Height = 34
    .Caption = 'Sair'
    .Cancel = .T.
    PROCEDURE Click
        THISFORM.Release()
    ENDPROC
ENDWITH

* ---------------------------------------------------------------------------
* Método RefreshGrid
* ---------------------------------------------------------------------------
loForm.RefreshGrid = PROCEDURE
    LOCAL lcFiltro, lcInst, lcEstilo
    lcFiltro = ALLTRIM(THISFORM.txtFiltro.Value)
    lcInst = ALLTRIM(THISFORM.cmbFiltroInstrumento.Value)
    lcEstilo = ALLTRIM(THISFORM.cmbFiltroEstilo.Value)

    SELECT MÚSICA, AUTOR, GRUPO, ESTILO, INSTRUMENT, ORDEM, OBSERVAÇÕE ;
        FROM músicas ;
        WHERE (EMPTY(lcFiltro) .OR. UPPER(MÚSICA) LIKE '%' + UPPER(lcFiltro) + '%' ;
               .OR. UPPER(AUTOR) LIKE '%' + UPPER(lcFiltro) + '%') ;
          AND (EMPTY(lcInst) .OR. INSTRUMENT = lcInst) ;
          AND (EMPTY(lcEstilo) .OR. ESTILO = lcEstilo) ;
        ORDER BY ORDEM, MÚSICA ;
        INTO CURSOR qryMusicas READWRITE

    loForm.gridMusicas.RecordSource = 'qryMusicas'
    loForm.gridMusicas.Refresh()
ENDPROC

* Inicializa
loForm.RefreshGrid()
loForm.ShowModal()

ENDPROC