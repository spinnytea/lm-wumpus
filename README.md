Setting up the project
===
1. download lime
1. from with in lime, run `npm link`
1. from within lm-wumpus, run `npm link lime`
1. npm install
1. bower install
1. gulp run
1. http://localhost:3000/index.html

Currently, you'll need to reconfigure the config init location `src/server/index.js`.
* Wumpus needs a temporary/throwaway directory. You can use an external drive, a RAM Disk, whatever. You can blow it away or reuse it as needed. The initial testing/research with wumpus is for both starting from scratch AND reusing existing information.
* Todo needs the location to be the todo_database. It's checked into this repo only because they are useful notes we don't want to loose. And git diff is pretty good for debugging changes.
