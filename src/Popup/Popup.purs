module Popup.Popup where

import Prelude

import Data.Maybe (Maybe(..))
import Effect (Effect)
import Effect.Console (log)
import Web.DOM (Element)
import Web.DOM.Element as Element
import Web.HTML.HTMLDocument as HTMLDocument
import Web.DOM.Node (setTextContent, toEventTarget)
import Web.Event.Event (EventType(..))
import Web.Event.EventTarget (addEventListener, eventListener)
import Web.HTML (window)
import Web.HTML.Window (document)
import Web.DOM.NonElementParentNode (getElementById) as HTMLDocument
import Web.HTML.HTMLDocument.ReadyState (ReadyState(..)) as HTMLDocument

-- Types pour l'état de l'extension
data ExtensionAction
  = MainAction
  | SettingsAction
  | AboutAction

-- Fonction pour afficher un message de statut
showStatus :: String -> String -> Effect Unit
showStatus message statusType = do
  log $ "Status: " <> message <> " (" <> statusType <> ")"
  win <- window
  htmlDoc <- document win
  let domDoc = HTMLDocument.toNonElementParentNode htmlDoc

  -- Mettre à jour le message
  maybeStatusMsg <- HTMLDocument.getElementById "statusMessage" domDoc
  case maybeStatusMsg of
    Just statusMsg -> setTextContent message (Element.toNode statusMsg)
    Nothing -> log "Element statusMessage non trouvé"

  -- Mettre à jour le conteneur de statut
  maybeStatus <- HTMLDocument.getElementById "status" domDoc
  case maybeStatus of
    Just status -> do
      Element.setAttribute "class" ("status " <> statusType) status
      Element.setAttribute "style" "display: block;" status
    Nothing -> log "Element status non trouvé"

-- Gestionnaires d'événements
handleMainAction :: Effect Unit
handleMainAction = do
  log "Action principale déclenchée"
  showStatus "Action exécutée avec succès!" "success"

handleSettingsAction :: Effect Unit
handleSettingsAction = do
  log "Ouverture des paramètres"
  showStatus "Paramètres en cours de développement" "error"

handleAboutAction :: Effect Unit
handleAboutAction = do
  log "À propos de l'extension"
  showStatus "Extension PureScript v1.0.0" "success"

-- Fonction pour attacher un événement à un élément
attachClickEvent :: String -> Effect Unit -> Effect Unit
attachClickEvent elementId handler = do
  win <- window
  htmlDoc <- document win
  let domDoc = HTMLDocument.toNonElementParentNode htmlDoc

  maybeElement <- HTMLDocument.getElementById elementId domDoc
  case maybeElement of
    Just element -> do
      listener <- eventListener (\_ -> handler)
      addEventListener (EventType "click") listener false (toEventTarget (Element.toNode element))
      log $ "Événement attaché à " <> elementId
    Nothing -> log $ "Élément " <> elementId <> " non trouvé"

-- Fonction pour attacher tous les événements
attachEventListeners :: Effect Unit
attachEventListeners = do
  log "Configuration des événements..."

  -- Attacher les événements aux boutons
  attachClickEvent "actionBtn" handleMainAction
  attachClickEvent "settingsBtn" handleSettingsAction
  attachClickEvent "aboutBtn" handleAboutAction

  log "Tous les événements configurés"

-- Fonction d'initialisation qui s'assure que le DOM est prêt
initializeWhenReady :: Effect Unit
initializeWhenReady = do
  win <- window
  htmlDoc <- document win

  -- Vérifier si le DOM est prêt
  readyState <- HTMLDocument.readyState htmlDoc
  case readyState of
    -- Si le document est déjà chargé, initialiser immédiatement
    HTMLDocument.Loading -> do
      log "DOM en cours de chargement, attente..."
      -- Dans un vrai cas, on utiliserait un event listener pour DOMContentLoaded
      -- Pour simplifier, on va juste attendre un peu
      attachEventListeners
    _ -> do
      log "DOM prêt, initialisation..."
      attachEventListeners

-- Point d'entrée principal
main :: Effect Unit
main = do
  log "🚀 Popup PureScript initialisé"
  initializeWhenReady
