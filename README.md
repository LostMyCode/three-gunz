# Three GunZ Project  
Recreating GunZ The Duel as a web version using Three.js  

![image](https://user-images.githubusercontent.com/63048878/131472829-823366c7-83a1-48ed-a10f-6899dbfa5db7.png)

GunZ was a fast-paced online third-person shooter (TPS) developed by MAIET Entertainment.

## Just out of curiosity / For fun

Around 2007, the GunZ source code (mostly written in C++) was leaked.  
After that, many developers created tools, private servers, custom clients, and various fan projects.  
I was also one of them — I messed around with it quite a bit between ~2012 and 2016.

Now, years later, what I really want to try is:  
**bringing GunZ back to life… in the browser.**

# Demo(s)

Here are some early demos from the project.

## Loading & rendering a GunZ map (Town) in the browser with Three.js

![LoadTownWithThreeJS](https://user-images.githubusercontent.com/63048878/131979273-abc81278-3cd6-4365-97b2-99f54ca6a67e.png)

Demo: https://gunz.sigr.io/test/web-world/  
Repository: https://github.com/LostMyCode/three-gunz/tree/master/test/web-world

I finally built a GunZ map reader/converter!  
Still working on proper lightmap support though.

## Rendering a GunZ NPC (Palmpoa / MOB) with Three.js

![DrawPalmpoa](https://user-images.githubusercontent.com/63048878/131980208-294d0962-9add-4ca1-a894-2561323bc7c0.png)

Demo: https://gunz.sigr.io/test/web-palmpoa/  
Repository: https://github.com/LostMyCode/three-gunz/tree/master/test/web-palmpoa

For this one I used Blender 2.8 to convert the original GunZ model (.elu) into .glb format.

## Update: Full Browser Port (2026) - Now the Entire GunZ Runs in Your Browser!

From the original Three.js map loader demo (2021) → **I finally achieved the full port!**  
The **complete original GunZ The Duel client** (including MatchServer) now runs **entirely in the browser** using WebAssembly.

<img width="510" alt="whiplash-gunz" src="https://github.com/user-attachments/assets/6350e213-7c9a-4069-88b5-37ea8b880aad" />

### Key Achievements
- Original GunZ binaries compiled to WebAssembly via Emscripten (real native execution, not a remake).
- D3D9 rendering translated to WebGL in real-time (custom wrapper – check my other projects).
- Networking via WebSocket proxy.
- Filesystem handled with IndexedDB (all .rs, .elu, sounds, etc. load and persist in browser).
- **MatchServer also compiled to WASM** → Play solo/local deathmatch without any external server!

**Just open the link and play – no downloads, no installs, nothing required.**

▶ **Playable Demo (Browser GunZ Full Version)**:  
[Click here to play instantly](https://gunz.sigr.io/)

This project started as a fun Three.js experiment with GunZ maps... now it's a full browser revival of GunZ.  
Huge thanks to the community for the motivation back then!

GunZ forever in the browser era 🔥  
If you're interested in collaborating (perf improvements, multiplayer WebRTC proxy, etc.), feel free to open issues or reach out.

Last updated: March 2026
