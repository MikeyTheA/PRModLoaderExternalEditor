# External editor for PokeRogueModLoader

This is needed to develop mods for [PokeRogueModLoader](https://github.com/MikeyTheA/PokeRogueModLoader), it works by syncing the mod in the mod loader and the file system.

## Usage
1. Clone the repository `git clone https://github.com/MikeyTheA/PRModLoaderExternalEditor`
2. Download dependencies ([node](https://nodejs.org/en) required) `npm install`
3. Run the program `npm run start`
4. Go to your PokeRogueModLoader instance and it should sync your mods folder

## Making a mod
1. Create a folder in the mods folder, call it what you want your mod called
2. Create a `mod.json` file in your mod folder
```
{
    "name": "Example mod",
    "description": "Example mod with an example mod.json",
    "author": "mikeythea @ discord.gg"
}
```
3. Create your scripts with the .ts extension (typescript). `script.ts` for example.

## Development

We have a [wiki](https://github.com/MikeyTheA/PRModLoaderExternalEditor/wiki) at https://github.com/MikeyTheA/PRModLoaderExternalEditor/wiki

## Publishing to the mod browser

Simply make a Github repository and push to it from your mod loader.
You need to also add the `pokeroguemod` topic to your github repository.