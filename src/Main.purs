module Main where

import Prelude
import Effect (Effect)
import Effect.Console (log)
import Pug (renderFile, render)

main :: Effect Unit
main = do
  -- Render from file with data
  let templateData = { title: "Hello World", name: "PureScript", items: ["Item 1", "Item 2", "Item 3"] }
  html1 <- renderFile "./src/templates/index.pug" templateData
  log html1

  -- Render from string with data
  let template = "h1= title\np Welcome #{name}!"
  html2 <- render template { title: "Hello", name: "PureScript" }
  log html2
