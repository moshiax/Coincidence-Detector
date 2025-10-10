# ((( Coincidence Detector )))

## Branches

* master      - Base for files common to all branches
* chrome      - Fork of master for Chrome 
* ff          - Fork of master for Firefox
* firefox     - (deprecated) Port for Firefox using WebExtensions API
* firefox-sdk - (deprecated) Port for Firefox using Firefox Add -on SDK
* jse/chrome  - (deprecated) Fork of master for unreleased ✡✡✡Jewish Solidarity Enhancer✡✡✡

## Online Presence

### Sites

* https://coincidencedetector.com/ (Official Site)
* https://gateway.ipfs.io/ipns/QmTt8KxYeMdjWg2wMHSgctuHE5uHgd8Un7dd52esK75v28/ (IPFS)
* https://gateway.ipfs.io/ipns/coincidencedetector.com/ (IPFS)
* https://tiny.cc/echoes (Redirect to IPFS)
* http://127.0.0.1:43110/1As8nyiVibNzfjLiS1eCinYia2dK2ZgHiz/ (ZeroNet)

### Support Threads

* https://forum.therightstuff.biz/topic/53418/coincidence-detector-support (TRS)
* https://bbs.thegoyimknow.to/t/coincidence-detector-support/122547 (DS)
* https://forum.thepurityspiral.com/topic/6646/coincidence-detector-support (TPS)

## Log

### A New Policy For Git Branches

2017-07-04 :: @perception

Something that has been bothering me for a while was the fact that the
**master** branch and the **firefox** branch were completely disconnected even
though their contents were very similar.  It made a lot of things like
backporting and releasing new versions harder than it had to be, so I'm fixing
that today.

Starting today:

* **master** will be a platform-neutral branch
* **chrome** will be a Chrome-specific branch based on **master**
* **ff** will be a Firefox-specific branch based on **master**

The majority of development should happen in **master** or a feature branch based on **master**
if something drastic is being tried out.

When it comes time to release, I envision something like this:

```sh
# from master
git pull
git checkout chrome
git rebase master
# then make any changes necessary to manifest.json
git tag v14.88.26-chrome
```

For a Firefox release, you'd replace `chrome` with `ff`.

The only file that really needs to differ between Chrome and Firefox is
`manifest.json`, so the **master** branch will not have a `manifest.json` going
forward to prevent merge conflicts in the future.

Hopefully, this will allow me and future maintainers to release new versions of
the Coincidence Detector more efficiently.
