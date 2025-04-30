function getColorThemes() {
	const STORAGE_KEYS = {
		THEMES: 'colorThemes_data',
		PUBLISH_DATE: 'colorThemes_publishDate',
	};
function getPublishDate() {
	const iterator = document.createNodeIterator(
	document,
	NodeFilter.SHOW_COMMENT
		);
		let currentNode;
			while ((currentNode = iterator.nextNode())) {
			const match = currentNode.textContent.match(
				/Last Published: (.+?) GMT/
			);
			if (match) {
				return new Date(match[1]).getTime();
			}
		}
		console.warn('Publish date comment not found.');
    	return null;
		}

function loadFromStorage() {
	try {
		const storedPublishDate = localStorage.getItem(
		STORAGE_KEYS.PUBLISH_DATE
		),
		currentPublishDate = getPublishDate();
		if (
   			!currentPublishDate ||
    		!storedPublishDate ||
        	storedPublishDate !== currentPublishDate.toString()
		)
		return null;
		return JSON.parse(localStorage.getItem(STORAGE_KEYS.THEMES));
	} catch (error) {
		console.warn('Failed to load from localStorage:', error);
    	return null;
   	}
}

function saveToStorage(themes) {
	try {
       	const publishDate = getPublishDate();
		if (publishDate) {
			localStorage.setItem(
				STORAGE_KEYS.PUBLISH_DATE,
				publishDate.toString()
			);
			localStorage.setItem(STORAGE_KEYS.THEMES, JSON.stringify(themes));
		}
	} catch (error) {
		console.warn('Failed to save to localStorage:', error);
	}
}

window.colorThemes = {
	themes: {},
	getTheme(themeName = '', brandName = '') {
		const themeKeys = Object.keys(this.themes);
		if (!themeName) themeName = themeKeys[0];
		const theme = this.themes[themeName];
		if (!theme) return {};
		if (!theme.brands || Object.keys(theme.brands).length === 0)
		return theme;
		if (!brandName) brandName = Object.keys(theme.brands)[0];
		return theme.brands[brandName] || {};
	},
};

const cachedThemes = loadFromStorage();
if (cachedThemes) {
	window.colorThemes.themes = cachedThemes;
	document.dispatchEvent(new CustomEvent('colorThemesReady'));
	return;
}

const firstLink = document.querySelector(
	'link[href*="purelittle2025.webflow.css"]'
);
if (!firstLink?.href) {
	console.error('CSS-Datei nicht gefunden!');
	return null;
}

const themeVariables = new Set(),
	themeClasses = new Set(),
	brandClasses = new Set();
	fetch(firstLink.href)
	.then((response) => {
		if (!response.ok)
			throw new Error(
				Failed to fetch stylesheet: ${response.statusText}
			);
		return response.text();
	})
	.then((cssText) => {
		(cssText.match(/--_theme[\w-]+:\s*[^;]+/g) || []).forEach(
			(variable) => themeVariables.add(variable.split(':')[0].trim())
		);
		(cssText.match(/\.u-(theme|brand)-[\w-]+/g) || []).forEach(
			(className) => {
				if (className.startsWith('.u-theme-'))
					themeClasses.add(className);
				if (className.startsWith('.u-brand-'))
					brandClasses.add(className);
			}
		);

        const themeVariablesArray = Array.from(themeVariables);
			function checkClass(themeClass, brandClass = null) {
			const originalClasses = document.documentElement.className;
			document.documentElement.className = '';
			document.documentElement.classList.add(themeClass);
			if (brandClass)
				document.documentElement.classList.add(brandClass);

            const styleObject = {};
            themeVariablesArray.forEach(
				(variable) =>
					(styleObject[variable] = getComputedStyle(
    					document.documentElement
					).getPropertyValue(variable))
			);

            document.documentElement.className = originalClasses;
			return styleObject;
		}

        themeClasses.forEach((themeClassWithDot) => {
            const themeName = themeClassWithDot
				.replace('.u-theme-', '')
				.replace('.', '');
			window.colorThemes.themes[themeName] = {};
			if (brandClasses.size) {
				window.colorThemes.themes[themeName].brands = {};
				brandClasses.forEach((brandClassWithDot) => {
					const brandName = brandClassWithDot
						.replace('.u-brand-', '')
						.replace('.', '');
					window.colorThemes.themes[themeName].brands[brandName] =
						checkClass(
							themeClassWithDot.replace('.', ''),
							brandClassWithDot.replace('.', '')
						);
				});
			} else {
				window.colorThemes.themes[themeName] = checkClass(
					themeClassWithDot.replace('.', '')
				);
			}
		});

        saveToStorage(window.colorThemes.themes);
		document.dispatchEvent(new CustomEvent('colorThemesReady'));
	})
	.catch((error) => console.error('Error:', error.message));
}

window.addEventListener('DOMContentLoaded', getColorThemes);
