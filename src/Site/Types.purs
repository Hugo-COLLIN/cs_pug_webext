module Site.Types where

type PageData =
  { title :: String
  , content :: String
  , template :: String
  , slug :: String
  , meta ::
    { description :: String
    , keywords :: Array String
    }
  }

type SiteConfig =
  { title :: String
  , description :: String
  , baseUrl :: String
  , author :: String
  }

type BlogPost =
  { title :: String
  , date :: String
  , content :: String
  , slug :: String
  , excerpt :: String
  , tags :: Array String
  }
