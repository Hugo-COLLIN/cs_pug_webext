module Site.Generator where

import Prelude
import Effect (Effect)
import Effect.Console (log)
import Data.Traversable (traverse_)
import Data.String (joinWith)
import Pug (renderFile, writeFile, ensureDir, copyDir)
import Site.Types (PageData, SiteConfig, BlogPost)

-- Helper function to join paths
joinPath :: Array String -> String
joinPath parts = joinWith "/" parts

-- Site configuration
siteConfig :: SiteConfig
siteConfig =
  { title: "My Static Site"
  , description: "A static site built with PureScript and Pug"
  , baseUrl: "https://mysite.com"
  , author: "Your Name"
  }

-- Sample pages data
pages :: Array PageData
pages =
  [ { title: "Home"
    , content: "Welcome to my static site!"
    , template: "index"
    , slug: "index"
    , meta:
      { description: "Welcome to my static site built with PureScript"
      , keywords: ["purescript", "static", "site"]
      }
    }
  , { title: "About"
    , content: "This is the about page."
    , template: "about"
    , slug: "about"
    , meta:
      { description: "About this site"
      , keywords: ["about", "info"]
      }
    }
  ]

-- Sample blog posts
blogPosts :: Array BlogPost
blogPosts =
  [ { title: "My First Blog Post"
    , date: "2024-01-15"
    , content: "This is my first blog post content..."
    , slug: "first-post"
    , excerpt: "An introduction to my blog"
    , tags: ["intro", "blog"]
    }
  , { title: "PureScript and Static Sites"
    , date: "2024-01-20"
    , content: "How to build static sites with PureScript..."
    , slug: "purescript-static-sites"
    , excerpt: "Building static sites with functional programming"
    , tags: ["purescript", "tutorial"]
    }
  ]

-- Generate a single page
generatePage :: PageData -> Effect Unit
generatePage page = do
  log $ "Generating page: " <> page.title
  let templatePath = joinPath ["src", "templates", page.template <> ".pug"]
  let outputPath = joinPath ["dist", page.slug <> ".html"]

  let templateData =
        { title: page.title
        , content: page.content
        , site: siteConfig
        , meta: page.meta
        , slug: page.slug
        }

  html <- renderFile templatePath templateData
  writeFile outputPath html

-- Generate blog post
generateBlogPost :: BlogPost -> Effect Unit
generateBlogPost post = do
  log $ "Generating blog post: " <> post.title
  let templatePath = "src/templates/blog-post.pug"
  let outputPath = joinPath ["dist", "blog", post.slug <> ".html"]

  let templateData =
        { title: post.title
        , content: post.content
        , date: post.date
        , excerpt: post.excerpt
        , tags: post.tags
        , site: siteConfig
        , slug: post.slug
        }

  html <- renderFile templatePath templateData
  writeFile outputPath html

-- Generate blog index page
generateBlogIndex :: Array BlogPost -> Effect Unit
generateBlogIndex posts = do
  log "Generating blog index"
  let templatePath = "src/templates/blog-index.pug"
  let outputPath = "dist/blog/index.html"

  let templateData =
        { title: "Blog"
        , posts: posts
        , site: siteConfig
        }

  html <- renderFile templatePath templateData
  writeFile outputPath html

-- Main generator function
generateSite :: Effect Unit
generateSite = do
  log "Starting site generation..."

  -- Ensure directories exist
  ensureDir "dist"
  ensureDir "dist/blog"

  -- Copy static assets (from src/static to dist)
  log "Copying static assets..."
  copyDir "src/static" "dist"

  -- Generate pages
  log "Generating pages..."
  traverse_ generatePage pages

  -- Generate blog posts
  log "Generating blog posts..."
  ensureDir "dist/blog"
  traverse_ generateBlogPost blogPosts
  generateBlogIndex blogPosts

  log "Site generation complete!"
