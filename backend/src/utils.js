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
      throw new Error("No AI! (remove USE_AI env var to enable)");
    }

    const typhoon = true;

    const base_url = typhoon ? "https://api.opentyphoon.ai/v1/chat/completions" : "https://api.groq.com/openai/v1/chat/completions";
    const api_key = typhoon ? process.env.TYPHOON_API_KEY : process.env.GROQ_API_KEY;
    const model = typhoon ? "typhoon-v2.1-12b-instruct" : "openai/gpt-oss-120b";

    const response = await fetch(base_url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${api_key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const json = await response.json();
    const summary = json.choices[0].message.content;
    return summary;

  } catch (error) {
    // fallback to raw synopsis if AI fails
    return data?.synopsis?.slice(0, 200) + "...";
  }
}


function createPrompt(synopsis) {
  return `Rewrite the following anime synopsis into a clue-style version for a guessing game. 
The clue must: Avoid all specific names of characters, places, or groups. 
Be informative, focusing on key themes, conflicts, and settings. 
Stay precise and concise (2–4 sentences).
Keep it engaging enough to help players guess, without making it too obvious.

Now your turn:
Full synopsis:
${synopsis}
Clue-style synopsis:

*Also attach thai translation of that clue-style synopsis at the end of your response separated only by the symbol '|', so the format becomes <clue-style synopsis> | <thai translation>
*Do not include any escape characters like \n or \ in your response (put everything in a single line)
`
}

