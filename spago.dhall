{ name = "my-project"
, dependencies =
  [ "console"
  , "effect"
  , "maybe"
  , "prelude"
  , "web-dom"
  , "web-events"
  , "web-html"
  ]
, packages = ./packages.dhall
, sources = [ "src/**/*.purs", "test/**/*.purs" ]
}
