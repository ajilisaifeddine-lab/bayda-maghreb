[1mdiff --git a/package.json b/package.json[m
[1mindex 3de6465..3d5aa30 100644[m
[1m--- a/package.json[m
[1m+++ b/package.json[m
[36m@@ -1,32 +1,30 @@[m
[31m-cd ~/bayda-maghreb[m
[31m-[m
[31m-cat > package.json << 'EOF'[m
 {[m
   "name": "bayda-maghreb",[m
[31m-  "version": "1.1.4",[m
[31m-  "description": "Bayda Maghreb - 7 dialects clean + Gen Z Tech",[m
[31m-  "type": "module",[m
[32m+[m[32m  "version": "1.1.5",[m
[32m+[m[32m  "description": "North African dialect transliteration library - Kabyle, Libya, Tunisia, Algeria, Mauritania, Tifinagh.",[m
   "main": "index.js",[m
[31m-  "bin": {[m
[31m-    "bayda-maghreb": "index.js"[m
[31m-  },[m
   "scripts": {[m
[31m-    "test": "vitest run",[m
[31m-    "test:watch": "vitest"[m
[32m+[m[32m    "test": "vitest run"[m
[32m+[m[32m  },[m
[32m+[m[32m  "repository": {[m
[32m+[m[32m    "type": "git",[m
[32m+[m[32m    "url": "git+https://github.com/ajilisaifeddine-lab/bayda-maghreb.git"[m
   },[m
   "keywords": [[m
     "arabic",[m
     "darija",[m
     "kabyle",[m
[31m-    "amazigh",[m
     "maghreb"[m
   ],[m
   "author": "ajilis",[m
   "license": "MIT",[m
[31m-  "dependencies": {[m
[32m+[m[32m  "type": "module",[m
[32m+[m[32m  "bugs": {[m
[32m+[m[32m    "url": "https://github.com/ajilisaifeddine-lab/bayda-maghreb/issues"[m
[32m+[m[32m  },[m
[32m+[m[32m  "homepage": "https://github.com/ajilisaifeddine-lab/bayda-maghreb#readme",[m
[32m+[m[32m  "devDependencies": {[m
[32m+[m[32m    "typescript": "^7.0.2",[m
[32m+[m[32m    "vitest": "^5.0.4"[m
   }[m
 }[m
[31m-EOF[m
[31m-[m
[31m-cat package.json[m
[31m-npm test[m
