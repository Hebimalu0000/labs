import { getCollection, type CollectionEntry } from "astro:content";
import { locales } from "./i18n";
import { productFromUrl } from "./products";

export interface NavFile {
	type: "file";
	id: string; // the full path, and also the CollectionEntry id
	href: string;
	slug: string;
	title: string;
	collectionEntry: CollectionEntry<"docs">;
	isIndex: boolean;
}

export interface NavDirectory {
	type: "directory";
	id: string; // the full path
	href: string;
	slug: string;
	dirname: string; // the last component of the path
	title: string;
	entries: NavEntry[];
	isLanguageDirectory: boolean;
}

export type NavEntry = NavDirectory | NavFile;

export type Product =
	| "cheerp"
	| "cheerpj2"
	| "cheerpj3"
	| "cheerpx"
	| "cheerpx-for-flash"
	| "cheerpj-jnlp-runner"
	| "cheerpj-applet-runner"
	| "cheerpx-games-runner";

export function isProduct(value: unknown): value is Product {
	return (
		value === "cheerp" ||
		value === "cheerpj2" ||
		value === "cheerpj3" ||
		value === "cheerpx" ||
		value === "cheerpx-for-flash" ||
		value === "cheerpj-jnlp-runner" ||
		value === "cheerpj-applet-runner" ||
		value === "cheerpx-games-runner"
	);
}

/**
 * Unflattens a collection into an array of NavEntrys grouped recursively by directory.
 * For example, the collection
 * 		foo/page1.md
 *    bar/page2.md
 * becomes
 * ```json
 * [
 *   {
 *     "id": "foo",
 * 		 "entries": [foo/page1.md]
 *   },
 * 	 {
 *     "id": "bar",
 * 		 "entries": [bar/page2.md]
 *   }
 * ]
 * ```
 */
export async function getRootNav(): Promise<NavEntry[]> {
	// Get all the directories
	const files = await getCollection("docs", ({ data }) => {
		// Don't include drafts in production
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	const dirPaths = new Set<string>();
	for (const file of files) {
		const [directoryName] = splitPath(file.id);
		if (directoryName) {
			dirPaths.add(directoryName);
		}
	}

	const root: NavEntry[] = [];

	// Map of directory name to its entries. The root directory is "".
	const dirPathToEntries: { [path: string]: NavEntry[] } = {
		"": root,
	};

	// Sort so shortest dir names are first
	const sortedDirPaths = Array.from(dirPaths);
	sortedDirPaths.sort((a, b) => a.length - b.length);

	// Add all the directories to their respective parent directories (or root if they are top-level).
	function addDir(path: string) {
		const [parentPath, dirname] = splitPath(path);

		// Upsert parent dir
		let parentEntries = dirPathToEntries[parentPath];
		if (!parentEntries) {
			addDir(parentPath);
			parentEntries = dirPathToEntries[parentPath];
			if (!parentEntries)
				throw new Error("addDir(parentPath) didn't add to directoryEntryMap");
		}

		// Add this directory to its parent
		const slug = idToSlug(path);
		const myEntries: NavEntry[] = [];
		const me: NavDirectory = {
			type: "directory",
			id: path,
			slug,
			href: "/docs/" + slug,
			dirname,
			entries: myEntries,
			title: idToTitle(path),
			isLanguageDirectory: locales.includes(path),
		};
		parentEntries.push(me);
		dirPathToEntries[path] = myEntries;
	}
	for (const path of sortedDirPaths) {
		addDir(path);
	}

	// Add all the files to their respective parent directories.
	for (const file of files) {
		const [parentDir, filename] = splitPath(file.id);
		const parentDirEntries = dirPathToEntries[parentDir];
		if (!parentDirEntries) {
			throw new Error(
				`panic: parent directory ${parentDir} not found for file ${filename}`,
			);
		}
		const slug = idToSlug(file.id); // note: we don't allow slug override
		parentDirEntries.push({
			type: "file",
			id: file.id,
			slug,
			href: "/docs/" + slug,
			title: file.data.shortTitle ?? file.data.title,
			collectionEntry: file,
			isIndex: slug === idToSlug(parentDir),
		});
	}

	// Sort all the directory entries
	for (const listing of Object.values(dirPathToEntries)) {
		listing.sort((a, b) => {
			// Index pages always come first
			if (a.type === "file" && a.isIndex) return -1;
			if (b.type === "file" && b.isIndex) return 1;

			return a.id < b.id ? -1 : 1;
		});
	}

	// Sanity check that all the files are accounted for
	let numFiles = 0;
	function dfsVisit(entry: NavEntry) {
		if (entry.type === "file") {
			if (!files.find((f) => f.id === entry.id)) {
				throw new Error(`panic: file ${entry.id} not found`);
			}
			numFiles++;
		} else {
			for (const child of entry.entries) {
				dfsVisit(child);

				// If the directory has an index page, replace its autogenerated titles with the title of the index page
				if (child.slug === entry.slug) {
					entry.title = child.title;
				}
			}
		}
	}
	for (const entry of root) {
		dfsVisit(entry);
	}
	if (numFiles !== files.length) {
		throw new Error(
			`panic: number of files in root nav (${numFiles}) does not match number of files in collection (${files.length})`,
		);
	}

	return root;
}

export function findNavDirectory(
	nav: NavEntry[],
	pathComponents: string[],
): NavDirectory | undefined {
	if (pathComponents.length === 0) {
		throw new Error(
			"pathComponents must not be empty; use getRootNav() to get the entries of the root directory",
		);
	}

	const [first, ...rest] = pathComponents;
	for (const entry of nav) {
		if (entry.type === "directory" && entry.dirname === first) {
			if (rest.length === 0) {
				return entry;
			} else {
				return findNavDirectory(entry.entries, rest);
			}
		}
	}
	return undefined;
}

export async function findParentDirectoryOfId(
	id: string,
): Promise<NavDirectory | undefined> {
	const [parentDir] = splitPath(id);
	return findNavDirectory(await getRootNav(), parentDir.split("/"));
}

/** Splits a path in its directory and filename. */
function splitPath(path: string): [string, string] {
	const components = path.split("/");
	const filename = components[components.length - 1] ?? "";
	const directory = components.slice(0, -1).join("/");
	return [directory, filename];
}

// TODO: dont export, use NavEntry.title instead
/** Converts an id like `00-my-dir/00-my-page.md` to "My page". */
export function idToTitle(id: string): string {
	// Get last component
	const components = id.split("/");
	let filename = components[components.length - 1] ?? id;

	// Strip extension
	const dotIndex = filename.lastIndexOf(".");
	if (dotIndex !== -1) {
		filename = filename.slice(0, dotIndex);
	}

	// Remove leading numbers
	filename = filename.replace(/^\d+-/, "");

	// Convert to sentence case
	const [firstWord, ...words] = filename.split("-");
	if (!firstWord) throw new Error(`id ${id} is empty (has no first word)`);
	const upperFirstWord = firstWord[0]?.toUpperCase() + firstWord.slice(1);
	return [upperFirstWord, ...words].join(" ");
}

const slugComponentOverrides = new Map([["CONTRIBUTING", "contributing"]]);

function idToSlug(id: string): string {
	return id
		.replace(/\.mdx?$/, "")
		.replace("/index", "") // index.md overrides directory listing
		.split("/")
		.map((component) => {
			const part = component.replace(/^\d+-/, "");
			return slugComponentOverrides.get(part) ?? part;
		})
		.join("/");
}

export function flattenNav(entries: NavEntry[]): NavEntry[] {
	const result: NavEntry[] = [];

	function dfsVisit(entry: NavEntry) {
		result.push(entry);
		if (entry.type === "directory") {
			for (const child of entry.entries) {
				dfsVisit(child);
			}
		}
	}
	for (const entry of entries) {
		dfsVisit(entry);
	}

	return result;
}

/** Returns an array of NavEntries that path to the given entry ID. */
export function findEntryPath(
	nav: NavEntry[],
	id: string,
): NavEntry[] | undefined {
	function dfsVisit(entry: NavEntry, path: NavEntry[]): NavEntry[] | undefined {
		if (entry.id === id) {
			return [...path, entry];
		}

		if (entry.type === "directory") {
			for (const child of entry.entries) {
				const r = dfsVisit(child, [...path, entry]);
				if (r) return r;
			}
		}
		return undefined;
	}

	for (const entry of nav) {
		const r = dfsVisit(entry, []);
		if (r) return r;
	}
	return undefined;
}

export function findEntry(nav: NavEntry[], id: string): NavEntry | undefined {
	const path = findEntryPath(nav, id);
	if (!path) return undefined;
	return path[path.length - 1];
}

export function getLocalisedProductNav(
	nav: NavEntry[],
	product: Product,
	locale: string | undefined,
) {
	nav = findNavDirectory(nav, [product])?.entries ?? nav; // for labs (multiple products on one site)

	// Prioritise the current locale's language directory, if it exists.
	// For instance if the current locale is "ja", then /ja/page will replace /page if both exist.
	if (locale) {
		const localeDir = findNavDirectory(nav, [locale]);
		if (localeDir) {
			for (const entry of flattenNav(localeDir.entries)) {
				const idWithoutLocale = entry.id.replace(`${locale}/`, "");
				const existingEntry = findEntry(nav, idWithoutLocale);

				if (existingEntry) {
					existingEntry.href = entry.href;
					existingEntry.title = entry.title;
				} else {
					console.warn(`${entry.id} has no unlocalised equivalent`);
				}
			}
		}
	}

	// Remove all language directories
	nav = nav.filter(
		(entry) => entry.type !== "directory" || !entry.isLanguageDirectory,
	);

	return nav;
}
