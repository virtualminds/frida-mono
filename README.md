### How to compile & load

```sh
$ git clone -b USEWITHCARE git://github.com/virtualminds/frida-mono.git
$ cd frida-mono/

(EDIT FILE agent/index.js)

$ npm install
$ frida -U -f <MONO FILE.exe> --no-pause -l _agent.js
```

### Development workflow

To continuously recompile on change, keep this running in a terminal:

```sh
$ npm run watch
```

And use an editor like Visual Studio Code for code completion and instant
type-checking feedback.

### Notes

Actually is under development, this is just the code with lot of things to 
improve. It should work with mono android with a minimun chage on runtime.js 
(change the library name from mono-sgen to libmonosgen-2.0.so)
