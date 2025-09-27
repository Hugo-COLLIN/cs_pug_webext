module Background.Background where

import Prelude

import Effect (Effect)
import Effect.Console (log)

-- Gestionnaire pour l'installation de l'extension
handleInstall :: Effect Unit
handleInstall = do
  log "Extension installée"
  -- Ici vous pouvez initialiser des données, configurer des alarmes, etc.

-- Gestionnaire pour les messages depuis les content scripts ou popup
handleMessage :: String -> Effect String
handleMessage message = do
  log $ "Message reçu: " <> message
  case message of
    "ping" -> pure "pong"
    "getStatus" -> pure "Extension active"
    _ -> pure "Message non reconnu"

-- Gestionnaire pour les changements d'onglets
handleTabUpdate :: Effect Unit
handleTabUpdate = do
  log "Onglet mis à jour"
  -- Logique à exécuter lors des changements d'onglets

-- Point d'entrée du service worker
main :: Effect Unit
main = do
  log "Service Worker PureScript initialisé"
  handleInstall
