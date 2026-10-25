# LDraw part previews

Imported parts use the Three.js LDrawLoader (MIT). Missing embedded part definitions are fetched from the pinned `pybricks/ldraw` mirror at commit `c43ed06a128a10ed65675166bf42eb6fd608b9b0` through jsDelivr. The mirror contains the LDraw.org Parts Library, created by the LDraw community. Individual files retain author and license metadata. See https://github.com/pybricks/ldraw/blob/c43ed06a128a10ed65675166bf42eb6fd608b9b0/CAreadme.txt and https://www.ldraw.org/pt-policies.html for library terms (CC BY 4.0 / CC0 as specified by each file).

Embedded part definitions supplied by a model are preserved in project and LDraw exports. No BrickLink Studio binaries, artwork, proprietary part library, or code are distributed. The 26 built-in procedural shapes are original approximations.

Version 0.3 also includes a generated name/ID index from that same pinned LDraw snapshot (14,621 entries, combined with the starter palette into 14,623 distinct parts). Catalog thumbnails are rendered from the licensed geometry at runtime. `scripts/update-parts-index.py` reproduces the metadata index. Native Studio containers are read using zip.js (BSD-3-Clause); the public Studio container-format key is not a user credential.
