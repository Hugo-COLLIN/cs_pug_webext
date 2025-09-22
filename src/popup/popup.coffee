# Script pour le popup de l'extension
document.addEventListener 'DOMContentLoaded', ->

  class PopupManager
    constructor: ->
      @elements = {}
      @settings = {}
      @init()

    init: ->
      @cacheElements()
      @loadSettings()
      @bindEvents()

    cacheElements: ->
      @elements =
        enabledToggle: document.getElementById 'enabled-toggle'
        themeSelect: document.getElementById 'theme-select'
        saveButton: document.getElementById 'save-button'
        status: document.getElementById 'status'

    loadSettings: ->
      chrome.runtime.sendMessage
        type: 'getData'
      , (response) =>
        @settings = response
        @updateUI()

    updateUI: ->
      @elements.enabledToggle.checked = @settings.enabled ? false
      @elements.themeSelect.value = @settings.settings?.theme ? 'light'

    bindEvents: ->
      @elements.saveButton.addEventListener 'click', =>
        @saveSettings()

      @elements.enabledToggle.addEventListener 'change', =>
        @showStatus 'Configuration modifiée'

    saveSettings: ->
      newSettings =
        enabled: @elements.enabledToggle.checked
        settings:
          theme: @elements.themeSelect.value
          notifications: true

      chrome.runtime.sendMessage
        type: 'saveData'
        data: newSettings
      , (response) =>
        if response.success
          @showStatus 'Paramètres sauvegardés!', 'success'
          @notifyContentScripts()
        else
          @showStatus 'Erreur lors de la sauvegarde', 'error'

    showStatus: (message, type = 'info') ->
      @elements.status.textContent = message
      @elements.status.className = "status #{type}"

      setTimeout =>
        @elements.status.textContent = ''
        @elements.status.className = 'status'
      , 2000

    notifyContentScripts: ->
      chrome.tabs.query {active: true, currentWindow: true}, (tabs) ->
        if tabs[0]
          chrome.tabs.sendMessage tabs[0].id,
            type: 'settingsChanged'

  # Initialiser le gestionnaire du popup
  new PopupManager()
