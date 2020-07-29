declare const PKG_VERSION: string;
declare const PKG_ENV: 'production' | 'development';

interface Window {
  __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: any;
}

// format of markdown given by frontmatter-markdown-loader
declare module '*.md' {
  const info: { 
    attributes: Record<string, any>;
    html: string;
  };

  export default info;
}
