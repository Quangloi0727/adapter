module.exports = {
	parser: "@typescript-eslint/parser",
	parserOptions: {
		project: "tsconfig.json", tsconfigRootDir: __dirname, sourceType: "module"
	},
	plugins: ["@typescript-eslint/eslint-plugin"],
	extends: ["plugin:@typescript-eslint/recommended"],
	root: true,
	env: {
		node: true, jest: true
	},
	ignorePatterns: [".eslintrc.js"],
	rules: {
		"@typescript-eslint/interface-name-prefix": "off",
		"@typescript-eslint/explicit-function-return-type": "off",
		"@typescript-eslint/explicit-module-boundary-types": "off",
		"@typescript-eslint/no-explicit-any": "off",
		"max-len": ["error", {"code": 120}],
		"semi": ["error", "always"],
		"quotes": ["error", "single", {"allowTemplateLiterals": true}],
		"comma-dangle": ["error", "always-multiline"],
		"quote-props": ["error", "as-needed"],
		"object-curly-spacing": ["error", "always"],
		"computed-property-spacing": ["error", "never", {"enforceForClassMembers": true}],
		"arrow-parens": ["error", "as-needed"],
		"indent": ["error", 2],
		"no-multiple-empty-lines": ["error", {"max": 1, "maxBOF": 1, "maxEOF": 0}]
	}
};

