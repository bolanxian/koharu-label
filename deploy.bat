cd dist

git init
git add -A
git commit -m "deploy"

git push -f --progress "https://github.com/bolanxian/koharu-label.git" master:gh-pages