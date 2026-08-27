<div align="center">

![LLM Chat to Markdown Exporter logo](assets/icon128.png)

# LLM Chat → Markdown Exporter

**Save any AI chat as a clean Markdown file — in one click.**

Works on **Google AI Studio**, **Claude**, and **GLM / Z.ai**.

</div>

---

## What this does

This is a tiny Chrome extension that turns a conversation from a supported AI
chat site into a clean **`.md` (Markdown)** file you can keep, read, or edit
anywhere. It grabs the messages, code blocks, formatting, links, and (where
available) the AI's reasoning, while leaving out all the buttons and clutter.

| Site | Where |
| --- | --- |
| Google AI Studio | `aistudio.google.com` |
| Claude | `claude.ai` |
| GLM / Z.ai | `chatglm.cn`, `z.ai` |

---

## Install it (one time)

1. Open **`chrome://extensions`** in your browser.
2. Turn on **Developer mode** (top-right switch).
3. Click **Load unpacked**.
4. Pick the `LLMExport` folder you unzipped.
5. Make sure the extension card is **enabled**.

> You only do this once. After that, the button appears automatically whenever
> you open a supported chat.

---

## Use it (every time)

Open a chat on one of the supported sites, then export it in **any** of these
three ways:

- **Click the floating 📥 Export MD button** (top-right of the page), **or**
- **Click the extension's toolbar icon**, **or**
- Press **`Ctrl + Shift + E`** (on Mac: **`Cmd + Shift + E`**).

A `.md` file downloads to your **Downloads** folder, named after the
conversation title. That's it.

---

## Tips

- **Long AI Studio chats:** if a message seems missing, scroll to the bottom of
  the chat once, then export again (AI Studio only renders what's on screen).
- **"This site isn't supported":** you're on a host the extension doesn't know
  yet — open one of the supported sites above.
- **Nothing happens?** Try the keyboard shortcut or the toolbar icon. If those
  work, the page was still loading — just reload.
- **Changed your mind after exporting?** The downloaded `.md` is a normal text
  file — open it in any editor and tweak it.

---

## What gets saved

- Each message, labelled **👤 User** or **🤖 Assistant**.
- Code blocks (with language), **bold/italic** text, lists, links, quotes.
- The AI's **reasoning / thought process** (collapsed under a "Thought Process"
  section where the site shows it).
- On AI Studio: math formulas and cited **sources**.

## What does NOT get saved

- Copy / edit / retry buttons, thumbs-up/down, and other on-screen controls.
- Hidden screen-reader text.

---

*Questions or a site you'd like added? The extension auto-detects the site, so
most additions are just a small settings tweak away.*
