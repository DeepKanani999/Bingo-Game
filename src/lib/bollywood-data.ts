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
  { id: "bw1", title: "Sholay", type: "dialogue", text: "Yeh Dosti", hint: "Classic friendship song", imageUrl: "https://upload.wikimedia.org/wikipedia/en/5/52/Sholay-poster.jpg" },
  { id: "bw2", title: "Dilwale Dulhania Le Jayenge", type: "dialogue", text: "Raj meets Simran", hint: "Love at first sight", imageUrl: "https://upload.wikimedia.org/wikipedia/en/8/80/Dilwale_Dulhania_Le_Jayenge_poster.jpg" },
  { id: "bw3", title: "3 Idiots", type: "dialogue", text: "All Izz Well", hint: "Motivational catchphrase", imageUrl: "https://upload.wikimedia.org/wikipedia/en/d/df/3_idiots_poster.jpg" },
  { id: "bw4", title: "Kabhi Khushi Kabhi Gham", type: "scene", text: "London family drama", hint: "Multi-generational family", imageUrl: "https://upload.wikimedia.org/wikipedia/en/4/4d/Kabhi_Khushi_Kabhie_Gham..._poster.jpg" },
  { id: "bw5", title: "Lagaan", type: "dialogue", text: "Cricket vs. British Rule", hint: "Historic rebellion", imageUrl: "https://upload.wikimedia.org/wikipedia/en/b/b6/Lagaan.jpg" },
  { id: "bw6", title: "Rang De Basanti", type: "dialogue", text: "Young revolutionaries", hint: "Social activism", imageUrl: "https://upload.wikimedia.org/wikipedia/en/0/08/Rang_De_Basanti_poster.jpg" },
  { id: "bw7", title: "Munna Bhai MBBS", type: "dialogue", text: "Circuit's tricks", hint: "Comedy-drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/8/84/Munna_Bhai_M.B.B.S._poster.jpg" },
  { id: "bw8", title: "Kal Ho Naa Ho", type: "scene", text: "Tragic love story", hint: "Romantic drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/a/aa/Kal_Ho_Naa_Ho_poster.jpg" },
  { id: "bw9", title: "Hey Ram", type: "dialogue", text: "Religious conflict", hint: "Historical drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/c/ce/Hey_Ram.jpg" },
  { id: "bw10", title: "Jaane Tu... Ya Jaane Na", type: "dialogue", text: "Childhood friends romance", hint: "College romance", imageUrl: "https://upload.wikimedia.org/wikipedia/en/7/7b/Jaane_Tu..._Ya_Jaane_Na.JPG" },
  { id: "bw11", title: "Queen", type: "dialogue", text: "Solo honeymoon adventure", hint: "Female empowerment", imageUrl: "https://upload.wikimedia.org/wikipedia/en/4/45/QueenMoviePoster7thMarch.jpg" },
  { id: "bw12", title: "Chak De! India", type: "dialogue", text: "Hockey team victory", hint: "Sports drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/0/0c/Chak_De%21_India.jpg" },
  { id: "bw13", title: "Veer-Zaara", type: "dialogue", text: "Indo-Pak love story", hint: "Cross-border romance", imageUrl: "https://upload.wikimedia.org/wikipedia/en/1/1e/Veer-Zaara.jpg" },
  { id: "bw14", title: "Hera Pheri", type: "dialogue", text: "Comedy trio adventures", hint: "Comedy caper", imageUrl: "https://images.unsplash.com/photo-1534330207526-8e81f10ec6fe?auto=format&fit=crop&q=80&w=400" },
  { id: "bw15", title: "Dil Chahta Hai", type: "dialogue", text: "Three friends' journey", hint: "Coming-of-age friendship", imageUrl: "https://upload.wikimedia.org/wikipedia/en/d/db/Dil_Chahta_Hai.jpg" },
  { id: "bw16", title: "Phir Hera Pheri", type: "dialogue", text: "Money heist comedy", hint: "Sequel adventure", imageUrl: "https://upload.wikimedia.org/wikipedia/en/3/3a/Still-phir-hera-phir.jpg" },
  { id: "bw17", title: "Khosla Ka Ghosla", type: "dialogue", text: "Property dispute comedy", hint: "Satirical family drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/5/59/Khosla_Ka_Ghosla.jpg" },
  { id: "bw18", title: "Devdas", type: "dialogue", text: "Tragic romance", hint: "Epic love tragedy", imageUrl: "https://upload.wikimedia.org/wikipedia/en/9/9a/Devdas_%282002_Hindi_film%29.jpg" },
  { id: "bw19", title: "Gadar: Ek Prem Katha", type: "dialogue", text: "Partition love story", hint: "Historical romance", imageUrl: "https://upload.wikimedia.org/wikipedia/en/e/e5/Gadar_-_Ek_Prem_Katha_%28movie_poster%29.jpg" },
  { id: "bw20", title: "Dil Se", type: "dialogue", text: "Political thriller", hint: "Complex narrative", imageUrl: "https://upload.wikimedia.org/wikipedia/en/7/7a/Dil_Se_poster.jpg" },
  { id: "bw21", title: "Kuch Kuch Hota Hai", type: "dialogue", text: "College romance mystery", hint: "90s classic romance", imageUrl: "https://upload.wikimedia.org/wikipedia/en/0/07/Kuch_Kuch_Hota_Hai_poster.jpg" },
  { id: "bw22", title: "Darr", type: "dialogue", text: "Obsessive love thriller", hint: "Psychological thriller", imageUrl: "https://upload.wikimedia.org/wikipedia/en/3/34/Darr_poster.jpg" },
  { id: "bw23", title: "Dilwale", type: "dialogue", text: "Heist romance", hint: "Action romance", imageUrl: "https://upload.wikimedia.org/wikipedia/en/d/df/Dilwale.jpg" },
  { id: "bw24", title: "Bang Bang", type: "dialogue", text: "International adventure", hint: "Globe-trotting romance", imageUrl: "https://upload.wikimedia.org/wikipedia/en/0/06/Chittychittybangbangposter.jpg" },
  { id: "bw25", title: "Holiday", type: "dialogue", text: "Spy thriller", hint: "Action-packed drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/6/60/Theholidayposter.jpg" },
  { id: "bw26", title: "Kahaani", type: "dialogue", text: "Pregnant mystery", hint: "Suspenseful thriller", imageUrl: "https://upload.wikimedia.org/wikipedia/en/f/f2/Kahaani_poster.jpg" },
  { id: "bw27", title: "Pink", type: "dialogue", text: "Women's rights drama", hint: "Social justice theme", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/2/28/Pink_Film_Theater_%E6%9C%9D%E6%97%A5%E5%8A%87%E5%A0%B4_-_Yuya_Tamai.jpg" },
  { id: "bw28", title: "Badla", type: "dialogue", text: "Revenge thriller", hint: "Suspense-filled drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/0/0c/Badla_poster.jpg" },
  { id: "bw29", title: "NH10", type: "dialogue", text: "Road rage thriller", hint: "Intense action drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/4/4e/NH10_Poster.jpg" },
  { id: "bw30", title: "Phobia", type: "dialogue", text: "Psychological horror", hint: "Claustrophobic thriller", imageUrl: "https://upload.wikimedia.org/wikipedia/en/f/ff/Phobia_-_Poster.jpg" },
  { id: "bw31", title: "Andhadhun", type: "dialogue", text: "Blind pianist mystery", hint: "Neo-noir thriller", imageUrl: "https://upload.wikimedia.org/wikipedia/en/4/47/Andhadhun_poster.jpg" },
  { id: "bw32", title: "Tumhari Sulu", type: "dialogue", text: "Housewife transformation", hint: "Feel-good drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/3/37/Tumhari_Sulu_-_Poster.jpg" },
  { id: "bw33", title: "Shubh Mangal Saavdhan", type: "dialogue", text: "Taboo-breaking romance", hint: "Progressive love story", imageUrl: "https://upload.wikimedia.org/wikipedia/en/f/fe/Shubh_Mangal_Zyada_Saavdhan_poster.jpg" },
  { id: "bw34", title: "Bareilly Ki Barfi", type: "dialogue", text: "Love triangle comedy", hint: "Quirky romance", imageUrl: "https://upload.wikimedia.org/wikipedia/en/9/97/Bareilly_Ki_Barfi_Poster.jpg" },
  { id: "bw35", title: "Badhai Ho", type: "dialogue", text: "Parents' unexpected pregnancy", hint: "Family comedy drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/f/f5/Badhaai_Ho_Official_Poster.jpg" },
  { id: "bw36", title: "Gully Boy", type: "dialogue", text: "Rap music story", hint: "Urban hip-hop drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/0/07/Gully_Boy_poster.jpg" },
  { id: "bw37", title: "Lootera", type: "dialogue", text: "Period romance heist", hint: "Romantic period drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/c/cc/Lootera_poster.jpg" },
  { id: "bw38", title: "Udaan", type: "dialogue", text: "Father-son conflict", hint: "Coming-of-age drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/7/71/Udaan_Movie_Poster.jpg" },
  { id: "bw39", title: "Jai Bhim", type: "dialogue", text: "Social justice fight", hint: "Inspiring true story", imageUrl: "https://upload.wikimedia.org/wikipedia/en/a/ad/Jai_Bhim_film_poster.jpg" },
  { id: "bw40", title: "Article 15", type: "dialogue", text: "Caste discrimination", hint: "Socially relevant drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/1/11/Article_15_Poster.jpg" },
  { id: "bw41", title: "Raees", type: "dialogue", text: "Underworld crime drama", hint: "Smuggler's story", imageUrl: "https://upload.wikimedia.org/wikipedia/en/7/7e/Raees_film_poster.jpg" },
  { id: "bw42", title: "Padmaavat", type: "dialogue", text: "Historical epic romance", hint: "Grand period drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/7/73/Padmaavat_poster.jpg" },
  { id: "bw43", title: "Bajirao Mastani", type: "dialogue", text: "Warrior-princess love", hint: "Historical romance", imageUrl: "https://upload.wikimedia.org/wikipedia/en/c/c0/Bajirao_Mastani_poster.jpg" },
  { id: "bw44", title: "Goliyon Ki Rasleela", type: "dialogue", text: "Rajasthani love saga", hint: "Romantic period drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/e/e9/Ramleela_poster.jpg" },
  { id: "bw45", title: "Haider", type: "dialogue", text: "Kashmir political drama", hint: "Dark political thriller", imageUrl: "https://upload.wikimedia.org/wikipedia/en/f/f1/Haider_Poster.jpg" },
  { id: "bw46", title: "Dangal", type: "dialogue", text: "Wrestling champions", hint: "Inspiring sports drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/9/99/Dangal_Poster.jpg" },
  { id: "bw47", title: "PK", type: "dialogue", text: "Alien on Earth", hint: "Religious satire comedy", imageUrl: "https://upload.wikimedia.org/wikipedia/en/c/c3/PK_poster.jpg" },
  { id: "bw48", title: "Bajrangi Bhaijaan", type: "dialogue", text: "Cross-border kindness", hint: "Heartwarming drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/d/dd/Bajrangi_Bhaijaan_Poster.jpg" },
  { id: "bw49", title: "Kai Po Che", type: "dialogue", text: "Cricket friendship tragedy", hint: "Emotional sports drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/0/08/Kai_Poche_film_poster.jpg" },
  { id: "bw50", title: "Citadel: Honey Bunny", type: "dialogue", text: "Spy action-romance", hint: "Spy thriller series", imageUrl: "https://upload.wikimedia.org/wikipedia/en/c/c2/Citadel-_Honey_Bunny.jpg" },
  { id: "bw51", title: "Zindagi Na Milegi Dobara", type: "dialogue", text: "Spain road trip", hint: "Travel & friendship", imageUrl: "https://upload.wikimedia.org/wikipedia/en/1/17/Zindagi_Na_Milegi_Dobara.jpg" },
  { id: "bw52", title: "Taare Zameen Par", type: "dialogue", text: "Dyslexic child's journey", hint: "Educational drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/b/b4/Taare_Zameen_Par_Like_Stars_on_Earth_poster.png" },
  { id: "bw53", title: "Swades", type: "dialogue", text: "NRI returns home", hint: "Patriotic drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/8/85/Swades_poster.jpg" },
  { id: "bw54", title: "Drishyam", type: "dialogue", text: "Father's cover-up", hint: "Crime thriller", imageUrl: "https://upload.wikimedia.org/wikipedia/en/9/9e/DrishyamMovie.jpg" },
  { id: "bw55", title: "Toilet: Ek Prem Katha", type: "dialogue", text: "Sanitation revolution", hint: "Social comedy", imageUrl: "https://upload.wikimedia.org/wikipedia/en/1/12/Toilet_Ek_Prem_Katha.jpg" },
  { id: "bw56", title: "Secret Superstar", type: "dialogue", text: "Hidden singing talent", hint: "Musical drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/5/50/Secret_Superstar_-_Poster_3.jpg" },
  { id: "bw57", title: "URI", type: "dialogue", text: "How's the Josh?", hint: "War action drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/3/3b/URI_-_New_poster.jpg" },
  { id: "bw58", title: "War", type: "dialogue", text: "Spy vs Spy action", hint: "Action thriller", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c4/Hawai_Mare_oki_kaisen_poster.jpg" },
  { id: "bw59", title: "Simmba", type: "dialogue", text: "Corrupt cop reforms", hint: "Action comedy", imageUrl: "https://upload.wikimedia.org/wikipedia/en/8/82/Simmba_poster.jpg" },
  { id: "bw60", title: "Kabir Singh", type: "dialogue", text: "Obsessive lover", hint: "Romantic drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/d/dc/Kabir_Singh.jpg" },
  { id: "bw61", title: "Super 30", type: "dialogue", text: "Math genius teacher", hint: "Biographical drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/2/29/Super_30_The_Film.jpg" },
  { id: "bw62", title: "Chhichhore", type: "dialogue", text: "College hostel life", hint: "Comedy drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/3/3d/Chhichhore_Poster.jpg" },
  { id: "bw63", title: "Bala", type: "dialogue", text: "Premature baldness", hint: "Social comedy", imageUrl: "https://upload.wikimedia.org/wikipedia/en/9/99/Bala_Film_Poster.jpg" },
  { id: "bw64", title: "Good Newwz", type: "dialogue", text: "IVF baby mix-up", hint: "Comedy drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/7/76/Good_Newwz_film_poster.jpg" },
  { id: "bw65", title: "Thappad", type: "dialogue", text: "One slap changes all", hint: "Social drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/3/35/Thappad_film_poster.jpg" },
  { id: "bw66", title: "Panga", type: "dialogue", text: "Kabaddi comeback", hint: "Sports drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/7/7b/Panga_film_poster.jpg" },
  { id: "bw67", title: "Ludo", type: "dialogue", text: "Intertwined stories", hint: "Dark comedy", imageUrl: "https://upload.wikimedia.org/wikipedia/en/a/af/Ludo_film_poster.jpg" },
  { id: "bw68", title: "Roohi", type: "dialogue", text: "Ghost comedy", hint: "Horror comedy", imageUrl: "https://upload.wikimedia.org/wikipedia/en/c/c9/Roohi_film_poster.jpg" },
  { id: "bw69", title: "Atrangi Re", type: "dialogue", text: "Time-bending romance", hint: "Musical romance", imageUrl: "https://upload.wikimedia.org/wikipedia/en/e/e5/Atrangi_Re_film_poster.jpg" },
  { id: "bw70", title: "Gangubai Kathiawadi", type: "dialogue", text: "Mafia queen rise", hint: "Biographical drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/8/89/Gangubai_Kathiawadi_film_poster.jpg" },
  { id: "bw71", title: "RRR", type: "dialogue", text: "Freedom fighters duo", hint: "Action epic", imageUrl: "https://upload.wikimedia.org/wikipedia/en/d/d7/RRR_Poster.jpg" },
  { id: "bw72", title: "Brahmastra", type: "dialogue", text: "Astra universe", hint: "Fantasy adventure", imageUrl: "https://upload.wikimedia.org/wikipedia/en/e/ea/Brahmastra_Part_One_Shiva.jpg" },
  { id: "bw73", title: "Vikram Vedha", type: "dialogue", text: "Cop vs gangster", hint: "Neo-noir thriller", imageUrl: "https://upload.wikimedia.org/wikipedia/en/0/03/Vikram_Vedha_poster.jpg" },
  { id: "bw74", title: "Drishyam 2", type: "dialogue", text: "Sequel cover-up", hint: "Crime thriller", imageUrl: "https://upload.wikimedia.org/wikipedia/en/3/3f/Drishyam_2.jpg" },
  { id: "bw75", title: "Pathaan", type: "dialogue", text: "RAW spy mission", hint: "Action thriller", imageUrl: "https://upload.wikimedia.org/wikipedia/en/c/c3/Pathaan_film_poster.jpg" },
  { id: "bw76", title: "Tu Jhoothi Main Makkaar", type: "dialogue", text: "Breakup consultancy", hint: "Romantic comedy", imageUrl: "https://upload.wikimedia.org/wikipedia/en/b/b6/Tu_Jhoothi_Main_Makkaar_Title_Card.jpeg" },
  { id: "bw77", title: "Rocky Aur Rani", type: "dialogue", text: "Family class clash", hint: "Family drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/6/65/Rocky_Aur_Rani_Ki_Prem_Kahani.jpg" },
  { id: "bw78", title: "Jawan", type: "dialogue", text: "Vigilante justice", hint: "Action thriller", imageUrl: "https://upload.wikimedia.org/wikipedia/en/3/39/Jawan_film_poster.jpg" },
  { id: "bw79", title: "Dunki", type: "dialogue", text: "Immigration journey", hint: "Comedy drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/4/4f/Dunki_poster.jpg" },
  { id: "bw80", title: "Animal", type: "dialogue", text: "Father-son darkness", hint: "Crime drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/4/40/Animal_kingdom_poster.jpg" },
  { id: "bw81", title: "12th Fail", type: "dialogue", text: "UPSC dream", hint: "Biographical drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/f/f2/12th_Fail_poster.jpeg" },
  { id: "bw82", title: "Sam Bahadur", type: "dialogue", text: "War hero story", hint: "Biographical war", imageUrl: "https://upload.wikimedia.org/wikipedia/en/5/58/Sam_Bahadur_film_poster.jpg" },
  { id: "bw83", title: "Fighter", type: "dialogue", text: "IAF pilot story", hint: "Action drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/d/df/Fighter_film_teaser.jpg" },
  { id: "bw84", title: "Crew", type: "dialogue", text: "Airline heist", hint: "Comedy thriller", imageUrl: "https://upload.wikimedia.org/wikipedia/en/8/8f/Crew_2024_film_poster.jpeg" },
  { id: "bw85", title: "Shaitaan", type: "dialogue", text: "Family hostage", hint: "Psychological thriller", imageUrl: "https://upload.wikimedia.org/wikipedia/en/f/f0/Shaitaan_2024_film_theatrical_poster.jpeg" },
  { id: "bw86", title: "Laapataa Ladies", type: "dialogue", text: "Bride swap comedy", hint: "Social comedy", imageUrl: "https://upload.wikimedia.org/wikipedia/en/5/52/Laapataa_Ladies_poster.jpg" },
  { id: "bw87", title: "Amar Prem Ki Prem Kahani", type: "dialogue", text: "Cross-culture romance", hint: "Romantic comedy", imageUrl: "https://upload.wikimedia.org/wikipedia/en/0/0d/Amar_Prem_Ki_Prem_Kahani.jpg" },
  { id: "bw88", title: "Stree 2", type: "dialogue", text: "Ghost sequel comedy", hint: "Horror comedy", imageUrl: "https://upload.wikimedia.org/wikipedia/en/a/a1/Stree_2.jpg" },
  { id: "bw89", title: "Khel Khel Mein", type: "dialogue", text: "Phone secrets game", hint: "Comedy drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/5/5b/Khel_Khel_Mein_poster.jpg" },
  { id: "bw90", title: "Singham Again", type: "dialogue", text: "Cop universe returns", hint: "Action drama", imageUrl: "https://upload.wikimedia.org/wikipedia/en/0/04/Singham_Again_poster.jpg" },
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
