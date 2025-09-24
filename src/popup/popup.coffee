document.addEventListener 'DOMContentLoaded', ->
  console.log "Popup chargé pour #{APP_TARGET}"

  # language=pug
  pug`
    .popup-container
      header.popup-header
        h1#app-title Mon Extension
        .version-badge v{APP_VERSION}
      main.popup-main
        .form-group
          label.toggle-label
            input#enable-toggle(type="checkbox")
            .toggle-switch
            span Extension activée
        .form-group
          label Theme :
          select#theme-select
            option(value="light") Clair
            option(value="dark") Sombre
        .actions
          button.primary#save-btn Sauvegarder
          button.secondary#options-btn Options
        .status#status-message
  `

  showStatus = (message, type = 'info') ->
    statusEl = document.getElementById 'status-message'
    statusEl.textContent = message
    statusEl.className = "status #{type}"
    setTimeout ->
      statusEl.textContent = ''
      statusEl.className = 'status'
    , 2000

  setupEventHandlers = ->
    enableToggle = document.getElementById 'enable-toggle'
    themeSelect = document.getElementById 'theme-select'
    saveBtn = document.getElementById 'save-btn'

    chrome.storage.sync.get ['enabled', 'theme'], (result) ->
      enableToggle.checked = result.enabled ? true
      themeSelect.value = result.theme ? 'light'

    saveBtn.addEventListener 'click', ->
      settings =
        enabled: enableToggle.checked
        theme: themeSelect.value
      chrome.storage.sync.set settings, ->
        showStatus 'Paramètres sauvegardés!', 'success'

  setupEventHandlers()
