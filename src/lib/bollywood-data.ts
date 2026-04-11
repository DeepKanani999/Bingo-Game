// ============================================================
// Default Bollywood Dataset
// Used as fallback when no custom mappings exist
// ============================================================

export interface BollywoodItem {
  id: string
  title: string
  type: "dialogue" | "scene" | "actor" | "movie_name"
  text: string
  hint?: string
  imageUrl?: string
  referenceImageUrl?: string
}

const bollywoodDataset: BollywoodItem[] = [
  { id: "bw1", title: "Sholay", type: "dialogue", text: "Yeh Dosti", hint: "Classic friendship song", imageUrl: "https://images.unsplash.com/photo-1501179691607-cfa9c85a1cc9?auto=format&fit=crop&q=80&w=400" },
  { id: "bw2", title: "Dilwale Dulhania Le Jayenge", type: "dialogue", text: "Raj meets Simran", hint: "Love at first sight", imageUrl: "https://images.unsplash.com/photo-1518621736947-02375507d519?auto=format&fit=crop&q=80&w=400" },
  { id: "bw3", title: "3 Idiots", type: "dialogue", text: "All Izz Well", hint: "Motivational catchphrase", imageUrl: "https://images.unsplash.com/photo-1523050853173-f14d33450ed1?auto=format&fit=crop&q=80&w=400" },
  { id: "bw4", title: "Kabhi Khushi Kabhi Gham", type: "scene", text: "London family drama", hint: "Multi-generational family", imageUrl: "https://images.unsplash.com/photo-1514525253514-1711696fd0f2?auto=format&fit=crop&q=80&w=400" },
  { id: "bw5", title: "Lagaan", type: "dialogue", text: "Cricket vs. British Rule", hint: "Historic rebellion", imageUrl: "https://images.unsplash.com/photo-1531415074911-7132ef11e97f?auto=format&fit=crop&q=80&w=400" },
  { id: "bw6", title: "Rang De Basanti", type: "dialogue", text: "Young revolutionaries", hint: "Social activism", imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=400" },
  { id: "bw7", title: "Munna Bhai MBBS", type: "dialogue", text: "Circuit's tricks", hint: "Comedy-drama", imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=400" },
  { id: "bw8", title: "Kal Ho Naa Ho", type: "scene", text: "Tragic love story", hint: "Romantic drama", imageUrl: "https://images.unsplash.com/photo-1513415130310-adea3f4f89d6?auto=format&fit=crop&q=80&w=400" },
  { id: "bw9", title: "Hey Ram", type: "dialogue", text: "Religious conflict", hint: "Historical drama", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw10", title: "Jaane Tu... Ya Jaane Na", type: "dialogue", text: "Childhood friends romance", hint: "College romance", imageUrl: "https://images.unsplash.com/photo-1511551203524-9b232c2a07ab?auto=format&fit=crop&q=80&w=400" },
  { id: "bw11", title: "Queen", type: "dialogue", text: "Solo honeymoon adventure", hint: "Female empowerment", imageUrl: "https://images.unsplash.com/photo-1493119508027-2b584f234d6c?auto=format&fit=crop&q=80&w=400" },
  { id: "bw12", title: "Chak De! India", type: "dialogue", text: "Hockey team victory", hint: "Sports drama", imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=400" },
  { id: "bw13", title: "Veer-Zaara", type: "dialogue", text: "Indo-Pak love story", hint: "Cross-border romance", imageUrl: "https://images.unsplash.com/photo-1518621736947-02375507d519?auto=format&fit=crop&q=80&w=400" },
  { id: "bw14", title: "Hera Pheri", type: "dialogue", text: "Comedy trio adventures", hint: "Comedy caper", imageUrl: "https://images.unsplash.com/photo-1534330207526-8e81f10ec6fe?auto=format&fit=crop&q=80&w=400" },
  { id: "bw15", title: "Dil Chahta Hai", type: "dialogue", text: "Three friends' journey", hint: "Coming-of-age friendship", imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=400" },
  { id: "bw16", title: "Phir Hera Pheri", type: "dialogue", text: "Money heist comedy", hint: "Sequel adventure", imageUrl: "https://images.unsplash.com/photo-1534330207526-8e81f10ec6fe?auto=format&fit=crop&q=80&w=400" },
  { id: "bw17", title: "Khosla Ka Ghosla", type: "dialogue", text: "Property dispute comedy", hint: "Satirical family drama", imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=400" },
  { id: "bw18", title: "Devdas", type: "dialogue", text: "Tragic romance", hint: "Epic love tragedy", imageUrl: "https://images.unsplash.com/photo-1514525253514-1711696fd0f2?auto=format&fit=crop&q=80&w=400" },
  { id: "bw19", title: "Gadar: Ek Prem Katha", type: "dialogue", text: "Partition love story", hint: "Historical romance", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw20", title: "Dil Se", type: "dialogue", text: "Political thriller", hint: "Complex narrative", imageUrl: "https://images.unsplash.com/photo-1513415130310-adea3f4f89d6?auto=format&fit=crop&q=80&w=400" },
  { id: "bw21", title: "Kuch Kuch Hota Hai", type: "dialogue", text: "College romance mystery", hint: "90s classic romance", imageUrl: "https://images.unsplash.com/photo-1511551203524-9b232c2a07ab?auto=format&fit=crop&q=80&w=400" },
  { id: "bw22", title: "Darr", type: "dialogue", text: "Obsessive love thriller", hint: "Psychological thriller", imageUrl: "https://images.unsplash.com/photo-1513415130310-adea3f4f89d6?auto=format&fit=crop&q=80&w=400" },
  { id: "bw23", title: "Dilwale", type: "dialogue", text: "Heist romance", hint: "Action romance", imageUrl: "https://images.unsplash.com/photo-1514525253514-1711696fd0f2?auto=format&fit=crop&q=80&w=400" },
  { id: "bw24", title: "Bang Bang", type: "dialogue", text: "International adventure", hint: "Globe-trotting romance", imageUrl: "https://images.unsplash.com/photo-1493119508027-2b584f234d6c?auto=format&fit=crop&q=80&w=400" },
  { id: "bw25", title: "Holiday", type: "dialogue", text: "Spy thriller", hint: "Action-packed drama", imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=400" },
  { id: "bw26", title: "Kahaani", type: "dialogue", text: "Pregnant mystery", hint: "Suspenseful thriller", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw27", title: "Pink", type: "dialogue", text: "Women's rights drama", hint: "Social justice theme", imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=400" },
  { id: "bw28", title: "Badla", type: "dialogue", text: "Revenge thriller", hint: "Suspense-filled drama", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw29", title: "NH10", type: "dialogue", text: "Road rage thriller", hint: "Intense action drama", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw30", title: "Phobia", type: "dialogue", text: "Psychological horror", hint: "Claustrophobic thriller", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw31", title: "Andhadhun", type: "dialogue", text: "Blind pianist mystery", hint: "Neo-noir thriller", imageUrl: "https://images.unsplash.com/photo-1514525253514-1711696fd0f2?auto=format&fit=crop&q=80&w=400" },
  { id: "bw32", title: "Tumhari Sulu", type: "dialogue", text: "Housewife transformation", hint: "Feel-good drama", imageUrl: "https://images.unsplash.com/photo-1511551203524-9b232c2a07ab?auto=format&fit=crop&q=80&w=400" },
  { id: "bw33", title: "Shubh Mangal Saavdhan", type: "dialogue", text: "Taboo-breaking romance", hint: "Progressive love story", imageUrl: "https://images.unsplash.com/photo-1518621736947-02375507d519?auto=format&fit=crop&q=80&w=400" },
  { id: "bw34", title: "Bareilly Ki Barfi", type: "dialogue", text: "Love triangle comedy", hint: "Quirky romance", imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=400" },
  { id: "bw35", title: "Badhai Ho", type: "dialogue", text: "Parents' unexpected pregnancy", hint: "Family comedy drama", imageUrl: "https://images.unsplash.com/photo-1511551203524-9b232c2a07ab?auto=format&fit=crop&q=80&w=400" },
  { id: "bw36", title: "Gully Boy", type: "dialogue", text: "Rap music story", hint: "Urban hip-hop drama", imageUrl: "https://images.unsplash.com/photo-1500311546316-29177699d45e?auto=format&fit=crop&q=80&w=400" },
  { id: "bw37", title: "Lootera", type: "dialogue", text: "Period romance heist", hint: "Romantic period drama", imageUrl: "https://images.unsplash.com/photo-1518621736947-02375507d519?auto=format&fit=crop&q=80&w=400" },
  { id: "bw38", title: "Udaan", type: "dialogue", text: "Father-son conflict", hint: "Coming-of-age drama", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw39", title: "Jai Bhim", type: "dialogue", text: "Social justice fight", hint: "Inspiring true story", imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=400" },
  { id: "bw40", title: "Article 15", type: "dialogue", text: "Caste discrimination", hint: "Socially relevant drama", imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=400" },
  { id: "bw41", title: "Raees", type: "dialogue", text: "Underworld crime drama", hint: "Smuggler's story", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw42", title: "Padmaavat", type: "dialogue", text: "Historical epic romance", hint: "Grand period drama", imageUrl: "https://images.unsplash.com/photo-1511551203524-9b232c2a07ab?auto=format&fit=crop&q=80&w=400" },
  { id: "bw43", title: "Bajirao Mastani", type: "dialogue", text: "Warrior-princess love", hint: "Historical romance", imageUrl: "https://images.unsplash.com/photo-1501179691607-cfa9c85a1cc9?auto=format&fit=crop&q=80&w=400" },
  { id: "bw44", title: "Goliyon Ki Rasleela", type: "dialogue", text: "Rajasthani love saga", hint: "Romantic period drama", imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=400" },
  { id: "bw45", title: "Haider", type: "dialogue", text: "Kashmir political drama", hint: "Dark political thriller", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw46", title: "Dangal", type: "dialogue", text: "Wrestling champions", hint: "Inspiring sports drama", imageUrl: "https://images.unsplash.com/photo-1531415074911-7132ef11e97f?auto=format&fit=crop&q=80&w=400" },
  { id: "bw47", title: "PK", type: "dialogue", text: "Alien on Earth", hint: "Religious satire comedy", imageUrl: "https://images.unsplash.com/photo-1514525253514-1711696fd0f2?auto=format&fit=crop&q=80&w=400" },
  { id: "bw48", title: "Bajrangi Bhaijaan", type: "dialogue", text: "Cross-border kindness", hint: "Heartwarming drama", imageUrl: "https://images.unsplash.com/photo-1518621736947-02375507d519?auto=format&fit=crop&q=80&w=400" },
  { id: "bw49", title: "Kai Po Che", type: "dialogue", text: "Cricket friendship tragedy", hint: "Emotional sports drama", imageUrl: "https://images.unsplash.com/photo-1531415074911-7132ef11e97f?auto=format&fit=crop&q=80&w=400" },
  { id: "bw50", title: "Citadel: Honey Bunny", type: "dialogue", text: "Spy action-romance", hint: "Spy thriller series", imageUrl: "https://images.unsplash.com/photo-1493119508027-2b584f234d6c?auto=format&fit=crop&q=80&w=400" },
  { id: "bw51", title: "Zindagi Na Milegi Dobara", type: "dialogue", text: "Spain road trip", hint: "Travel & friendship", imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=400" },
  { id: "bw52", title: "Taare Zameen Par", type: "dialogue", text: "Dyslexic child's journey", hint: "Educational drama", imageUrl: "https://images.unsplash.com/photo-1511551203524-9b232c2a07ab?auto=format&fit=crop&q=80&w=400" },
  { id: "bw53", title: "Swades", type: "dialogue", text: "NRI returns home", hint: "Patriotic drama", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw54", title: "Drishyam", type: "dialogue", text: "Father's cover-up", hint: "Crime thriller", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw55", title: "Toilet: Ek Prem Katha", type: "dialogue", text: "Sanitation revolution", hint: "Social comedy", imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=400" },
  { id: "bw56", title: "Secret Superstar", type: "dialogue", text: "Hidden singing talent", hint: "Musical drama", imageUrl: "https://images.unsplash.com/photo-1514525253514-1711696fd0f2?auto=format&fit=crop&q=80&w=400" },
  { id: "bw57", title: "URI", type: "dialogue", text: "How's the Josh?", hint: "War action drama", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw58", title: "War", type: "dialogue", text: "Spy vs Spy action", hint: "Action thriller", imageUrl: "https://images.unsplash.com/photo-1493119508027-2b584f234d6c?auto=format&fit=crop&q=80&w=400" },
  { id: "bw59", title: "Simmba", type: "dialogue", text: "Corrupt cop reforms", hint: "Action comedy", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw60", title: "Kabir Singh", type: "dialogue", text: "Obsessive lover", hint: "Romantic drama", imageUrl: "https://images.unsplash.com/photo-1518621736947-02375507d519?auto=format&fit=crop&q=80&w=400" },
  { id: "bw61", title: "Super 30", type: "dialogue", text: "Math genius teacher", hint: "Biographical drama", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw62", title: "Chhichhore", type: "dialogue", text: "College hostel life", hint: "Comedy drama", imageUrl: "https://images.unsplash.com/photo-1511551203524-9b232c2a07ab?auto=format&fit=crop&q=80&w=400" },
  { id: "bw63", title: "Bala", type: "dialogue", text: "Premature baldness", hint: "Social comedy", imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=400" },
  { id: "bw64", title: "Good Newwz", type: "dialogue", text: "IVF baby mix-up", hint: "Comedy drama", imageUrl: "https://images.unsplash.com/photo-1511551203524-9b232c2a07ab?auto=format&fit=crop&q=80&w=400" },
  { id: "bw65", title: "Thappad", type: "dialogue", text: "One slap changes all", hint: "Social drama", imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=400" },
  { id: "bw66", title: "Panga", type: "dialogue", text: "Kabaddi comeback", hint: "Sports drama", imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=400" },
  { id: "bw67", title: "Ludo", type: "dialogue", text: "Intertwined stories", hint: "Dark comedy", imageUrl: "https://images.unsplash.com/photo-1514525253514-1711696fd0f2?auto=format&fit=crop&q=80&w=400" },
  { id: "bw68", title: "Roohi", type: "dialogue", text: "Ghost comedy", hint: "Horror comedy", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw69", title: "Atrangi Re", type: "dialogue", text: "Time-bending romance", hint: "Musical romance", imageUrl: "https://images.unsplash.com/photo-1514525253514-1711696fd0f2?auto=format&fit=crop&q=80&w=400" },
  { id: "bw70", title: "Gangubai Kathiawadi", type: "dialogue", text: "Mafia queen rise", hint: "Biographical drama", imageUrl: "https://images.unsplash.com/photo-1511551203524-9b232c2a07ab?auto=format&fit=crop&q=80&w=400" },
  { id: "bw71", title: "RRR", type: "dialogue", text: "Freedom fighters duo", hint: "Action epic", imageUrl: "https://images.unsplash.com/photo-1493119508027-2b584f234d6c?auto=format&fit=crop&q=80&w=400" },
  { id: "bw72", title: "Brahmastra", type: "dialogue", text: "Astra universe", hint: "Fantasy adventure", imageUrl: "https://images.unsplash.com/photo-1514525253514-1711696fd0f2?auto=format&fit=crop&q=80&w=400" },
  { id: "bw73", title: "Vikram Vedha", type: "dialogue", text: "Cop vs gangster", hint: "Neo-noir thriller", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw74", title: "Drishyam 2", type: "dialogue", text: "Sequel cover-up", hint: "Crime thriller", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw75", title: "Pathaan", type: "dialogue", text: "RAW spy mission", hint: "Action thriller", imageUrl: "https://images.unsplash.com/photo-1493119508027-2b584f234d6c?auto=format&fit=crop&q=80&w=400" },
  { id: "bw76", title: "Tu Jhoothi Main Makkaar", type: "dialogue", text: "Breakup consultancy", hint: "Romantic comedy", imageUrl: "https://images.unsplash.com/photo-1518621736947-02375507d519?auto=format&fit=crop&q=80&w=400" },
  { id: "bw77", title: "Rocky Aur Rani", type: "dialogue", text: "Family class clash", hint: "Family drama", imageUrl: "https://images.unsplash.com/photo-1511551203524-9b232c2a07ab?auto=format&fit=crop&q=80&w=400" },
  { id: "bw78", title: "Jawan", type: "dialogue", text: "Vigilante justice", hint: "Action thriller", imageUrl: "https://images.unsplash.com/photo-1493119508027-2b584f234d6c?auto=format&fit=crop&q=80&w=400" },
  { id: "bw79", title: "Dunki", type: "dialogue", text: "Immigration journey", hint: "Comedy drama", imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=400" },
  { id: "bw80", title: "Animal", type: "dialogue", text: "Father-son darkness", hint: "Crime drama", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw81", title: "12th Fail", type: "dialogue", text: "UPSC dream", hint: "Biographical drama", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw82", title: "Sam Bahadur", type: "dialogue", text: "War hero story", hint: "Biographical war", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw83", title: "Fighter", type: "dialogue", text: "IAF pilot story", hint: "Action drama", imageUrl: "https://images.unsplash.com/photo-1493119508027-2b584f234d6c?auto=format&fit=crop&q=80&w=400" },
  { id: "bw84", title: "Crew", type: "dialogue", text: "Airline heist", hint: "Comedy thriller", imageUrl: "https://images.unsplash.com/photo-1511551203524-9b232c2a07ab?auto=format&fit=crop&q=80&w=400" },
  { id: "bw85", title: "Shaitaan", type: "dialogue", text: "Family hostage", hint: "Psychological thriller", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw86", title: "Laapataa Ladies", type: "dialogue", text: "Bride swap comedy", hint: "Social comedy", imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=400" },
  { id: "bw87", title: "Amar Prem Ki Prem Kahani", type: "dialogue", text: "Cross-culture romance", hint: "Romantic comedy", imageUrl: "https://images.unsplash.com/photo-1518621736947-02375507d519?auto=format&fit=crop&q=80&w=400" },
  { id: "bw88", title: "Stree 2", type: "dialogue", text: "Ghost sequel comedy", hint: "Horror comedy", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
  { id: "bw89", title: "Khel Khel Mein", type: "dialogue", text: "Phone secrets game", hint: "Comedy drama", imageUrl: "https://images.unsplash.com/photo-1511551203524-9b232c2a07ab?auto=format&fit=crop&q=80&w=400" },
  { id: "bw90", title: "Singham Again", type: "dialogue", text: "Cop universe returns", hint: "Action drama", imageUrl: "https://images.unsplash.com/photo-1542310503-68f7736f33d7?auto=format&fit=crop&q=80&w=400" },
]

export function getBollywoodDataset(size: 50 | 90 = 90): BollywoodItem[] {
  if (size === 50) {
    return bollywoodDataset.slice(0, 50)
  }
  return bollywoodDataset
}

/**
 * Convert the default dataset to number→movie mappings for DB seeding.
 */
export function getDefaultBollywoodMappings(): Array<{
  number: number
  movie_name: string
  dialogue: string
  image_url: string | null
}> {
  return bollywoodDataset.map((item, index) => ({
    number: index + 1,
    movie_name: item.title,
    dialogue: item.text,
    image_url: item.imageUrl || null,
  }))
}

/**
 * Find a specific item by its title for UI lookups.
 */
export function getBollywoodItemByTitle(title: string): BollywoodItem | null {
  const item = bollywoodDataset.find((i) => i.title.toLowerCase() === title.toLowerCase())
  if (!item) return null
  
  return {
    ...item,
    referenceImageUrl: item.imageUrl || "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=800", // Fallback image
  }
}
