export async function createCluesByData(data) {
  const summary = data.synopsis ? await getSynopsisSummarization(data) : "";

  const clues = {
    1: {
      studios: data?.studios?.map(s => s.name) || [],
      status: data?.status
    },
    2: {
      mean: data?.mean,
      num_eps: data?.num_episodes,
      rating: data?.rating
    },
    3: {
      popularity: data?.popularity,
      genres: data?.genres?.map(g => g.name) || [],
      startdate: data?.start_date,
      enddate: data?.end_date,
      season: data?.start_season ? `${data.start_season.season} ${data.start_season.year}` : null
    },
    4: {
      synopsis: summary
    },
    5: {
      main_picture: data?.main_picture,
      pictures: data?.pictures
    },
    answer: data.id
  };

  return clues;
}


export async function getSynopsisSummarization(data) {
  const prompt = createPrompt(data.synopsis || "");

  try {

    if (process.env.USE_AI == "False") {
      throw new Error("No AI!");
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const json = await response.json();
    const summary = json.choices[0].message.content;
    return summary;

  } catch (error) {
    console.log(error);

    // fallback to raw synopsis if AI fails
    return data?.synopsis?.slice(0, 200) + "...";
  }
}


function createPrompt(synopsis) {
  return `Rewrite the following anime synopsis into a clue-style version for a guessing game. 
The clue must: Avoid all specific names of characters, places, or groups. 
Be vague but informative, focusing on key themes, conflicts, and settings. 
Stay precise and concise (2–4 sentences).
Keep it engaging enough to help players guess, without making it too obvious.

Example
Full synopsis:
"Centuries ago, mankind was slaughtered to near extinction by monstrous humanoid creatures called titans, forcing humans to hide in fear behind enormous concentric walls. What makes these giants truly terrifying is that their taste for human flesh is not born out of hunger but what appears to be out of pleasure. To ensure survival, the remnants of humanity began living within defensive barriers, resulting in one hundred years without a single titan encounter. However, that fragile calm is soon shattered when a colossal titan manages to breach the supposedly impregnable outer wall, reigniting the fight for survival against the man-eating abominations."
Clue-style synopsis:
"Humanity hides behind great barriers after giant man-eating beings nearly wiped them out. After a century of peace, one massive creature shatters the defenses, forcing a desperate battle for survival."

Now your turn:
Full synopsis:
${synopsis}
Clue-style synopsis:

*Also attach thai translation of that clue-style synopsis at the end of your response separated only by the symbol '|'.
`
}

