/**
 * Vibgyor content policy — only these categories are moderated/banned.
 *
 * Visual (AWS Rekognition): nudity/sexual, violence/graphic, hate symbols,
 * self-harm cues, dangerous drug-related imagery.
 * Text (caption/content keywords): hate, harassment, spam, scams, self-harm,
 * dangerous activities, copyright hints, misinformation.
 *
 * Copyright & misinformation cannot be proven by vision alone; text rules only
 * raise flags for admin review unless risk is very high.
 */

const POLICY_CATEGORIES = [
	'adult_content', // Nudity and sexual content
	'violence', // Violence and graphic content
	'hate_speech', // Hate speech
	'harassment', // Bullying and harassment
	'spam', // Spam
	'scam', // Scams and fraud
	'self_harm', // Self-harm content
	'dangerous_activities', // Dangerous activities
	'copyright', // Copyright violations
	'fake_news', // Misinformation
	'safe',
];

/** Schema / API enum values used on ContentModeration.aiAnalysis.categories */
const CATEGORY_ENUM = [
	'spam',
	'inappropriate',
	'harassment',
	'hate_speech',
	'violence',
	'adult_content',
	'fake_news',
	'copyright',
	'scam',
	'self_harm',
	'dangerous_activities',
	'safe',
];

/**
 * Rekognition label or parent name → policy category.
 * Adult: only real nudity / sexual activity — NOT Suggestive (bikini, swimwear, lingerie).
 * Labels not in this map (alcohol, tobacco, gambling, suggestive, etc.) are ignored.
 */
const REKOGNITION_LABEL_POLICY = {
	// Nudity / sexual only (no Suggestive / swimwear)
	'Explicit Nudity': 'adult_content',
	Nudity: 'adult_content',
	'Sexual Activity': 'adult_content',
	'Illustrated Explicit Nudity': 'adult_content',
	'Adult Toys': 'adult_content',
	'Exposed Female Genitalia': 'adult_content',
	'Exposed Male Genitalia': 'adult_content',
	'Exposed Buttocks Or Anus': 'adult_content',
	'Explicit Sexual Activity': 'adult_content',
	'Sex Toys': 'adult_content',
	// Violence / graphic
	Violence: 'violence',
	'Graphic Violence Or Gore': 'violence',
	'Physical Violence': 'violence',
	'Weapon Violence': 'violence',
	Weapons: 'violence',
	Weapon: 'violence',
	Gun: 'violence',
	Knife: 'violence',
	Sword: 'violence',
	Axe: 'violence',
	Explosive: 'violence',
	'Explosive Weapon': 'violence',
	Handgun: 'violence',
	Rifle: 'violence',
	Shotgun: 'violence',
	Ammunition: 'violence',
	'Visually Disturbing': 'violence',
	Corpses: 'violence',
	'Blood & Gore': 'violence',
	Blood: 'violence',
	Gore: 'violence',
	Hanging: 'self_harm',
	'Air Accident': 'violence',
	'Emaciated Bodies': 'self_harm',
	'Hate Symbols': 'hate_speech',
	'Nazi Party': 'hate_speech',
	'White Supremacy': 'hate_speech',
	Extremist: 'hate_speech',
	Drugs: 'dangerous_activities',
	'Drug Products': 'dangerous_activities',
	'Drug Use': 'dangerous_activities',
	Pills: 'dangerous_activities',
};

/** Always treat as delete-tier when confidence >= MIN (blood / weapons / gore). */
const ALWAYS_DELETE_VISUAL_LABELS = new Set([
	'Weapons',
	'Weapon',
	'Gun',
	'Knife',
	'Sword',
	'Axe',
	'Explosive',
	'Explosive Weapon',
	'Handgun',
	'Rifle',
	'Shotgun',
	'Ammunition',
	'Weapon Violence',
	'Graphic Violence Or Gore',
	'Blood & Gore',
	'Blood',
	'Gore',
	'Corpses',
	'Visually Disturbing',
	'Physical Violence',
]);

const HIGH_RISK_VISUAL_LABELS = new Set([
	'Explicit Nudity',
	'Nudity',
	'Sexual Activity',
	'Illustrated Explicit Nudity',
	'Graphic Violence Or Gore',
	'Physical Violence',
	'Weapon Violence',
	'Weapons',
	'Weapon',
	'Gun',
	'Knife',
	'Sword',
	'Axe',
	'Explosive',
	'Explosive Weapon',
	'Handgun',
	'Rifle',
	'Shotgun',
	'Ammunition',
	'Visually Disturbing',
	'Blood & Gore',
	'Blood',
	'Gore',
	'Hate Symbols',
	'Emaciated Bodies',
	'Corpses',
]);

/** Caption / content keyword rules → { category, risk, reason } */
const TEXT_POLICY_RULES = [
	{
		category: 'adult_content',
		risk: 70,
		reason: 'Nudity or sexual content detected in text',
		keywords: ['nude pic', 'full nude', 'sex tape', 'explicit porn', 'xxx video'],
	},
	{
		category: 'violence',
		risk: 60,
		reason: 'Violence or graphic content detected in text',
		keywords: ['i will kill', 'going to kill', 'behead', 'shoot up', 'bomb threat'],
	},
	{
		category: 'hate_speech',
		risk: 70,
		reason: 'Hate speech detected',
		keywords: ['kill all', 'racial slur', 'gas the', 'white power', 'nazi forever'],
	},
	{
		category: 'harassment',
		risk: 55,
		reason: 'Bullying or harassment detected',
		keywords: ['kill yourself', 'kys', 'you should die', 'nobody likes you', 'rape you'],
	},
	{
		category: 'spam',
		risk: 45,
		reason: 'Spam content detected',
		keywords: ['buy now', 'click here', 'free money', 'limited offer', 'dm for promo', 'follow for follow'],
	},
	{
		category: 'scam',
		risk: 65,
		reason: 'Scam or fraud detected',
		keywords: [
			'send money',
			'wire transfer',
			'crypto giveaway',
			'double your bitcoin',
			'nigerian prince',
			'otp share',
			'share your otp',
			'bank details urgently',
		],
	},
	{
		category: 'self_harm',
		risk: 75,
		reason: 'Self-harm content detected',
		keywords: ['want to die', 'end my life', 'cut myself', 'suicide method', 'how to hang'],
	},
	{
		category: 'dangerous_activities',
		risk: 55,
		reason: 'Dangerous activity content detected',
		keywords: ['how to make a bomb', 'buy drugs online', 'drug delivery', 'weapon for sale', 'hire a hitman'],
	},
	{
		category: 'copyright',
		risk: 45,
		reason: 'Possible copyright violation',
		keywords: ['free full movie download', 'pirated movie', 'crack license key', 'warez download'],
	},
	{
		category: 'fake_news',
		risk: 45,
		reason: 'Possible misinformation',
		keywords: ['fake news alert', 'doctors hate this', 'secret cure government', '5g causes'],
	},
];

function resolveRekognitionCategory(labelName, parentName) {
	// Never ban Suggestive / swimwear / lingerie (bikini allowed)
	const ignored = new Set([
		'Suggestive',
		'Female Swimwear Or Underwear',
		'Male Swimwear Or Underwear',
		'Partial Nudity',
		'Barechested Male',
		'Revealing Clothes',
		'Sexual Situations',
		'Non-Explicit Nudity of Intimate parts and Kissing',
	]);
	if (ignored.has(labelName) || ignored.has(parentName)) {
		return null;
	}

	if (REKOGNITION_LABEL_POLICY[labelName]) {
		return REKOGNITION_LABEL_POLICY[labelName];
	}
	if (parentName && REKOGNITION_LABEL_POLICY[parentName]) {
		return REKOGNITION_LABEL_POLICY[parentName];
	}
	for (const [key, category] of Object.entries(REKOGNITION_LABEL_POLICY)) {
		if (labelName && labelName.includes(key)) return category;
		if (parentName && parentName.includes(key)) return category;
	}
	return null; // ignore non-policy labels
}

function isHighRiskVisual(labelName, parentName) {
	return (
		HIGH_RISK_VISUAL_LABELS.has(labelName) ||
		HIGH_RISK_VISUAL_LABELS.has(parentName)
	);
}

function isAlwaysDeleteVisual(labelName, parentName) {
	return (
		ALWAYS_DELETE_VISUAL_LABELS.has(labelName) ||
		ALWAYS_DELETE_VISUAL_LABELS.has(parentName)
	);
}

function analyzeTextPolicy(rawText = '') {
	const text = String(rawText || '').toLowerCase();
	const categories = [];
	let riskScore = 0;
	let flagged = false;
	let flagReason = null;

	if (!text.trim()) {
		return { categories, riskScore, flagged, flagReason };
	}

	for (const rule of TEXT_POLICY_RULES) {
		if (rule.keywords.some((keyword) => text.includes(keyword))) {
			categories.push({
				category: rule.category,
				confidence: Math.min(95, rule.risk + 20),
				details: { source: 'text_policy' },
			});
			riskScore = Math.max(riskScore, rule.risk);
			flagged = true;
			flagReason = rule.reason;
		}
	}

	return { categories, riskScore, flagged, flagReason };
}

module.exports = {
	POLICY_CATEGORIES,
	CATEGORY_ENUM,
	REKOGNITION_LABEL_POLICY,
	HIGH_RISK_VISUAL_LABELS,
	ALWAYS_DELETE_VISUAL_LABELS,
	TEXT_POLICY_RULES,
	resolveRekognitionCategory,
	isHighRiskVisual,
	isAlwaysDeleteVisual,
	analyzeTextPolicy,
};
