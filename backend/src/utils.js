export async function createCluesByData(data) {
  const summary = await getSynopsisSummarization(data);

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
    }
  };

  return clues;
}


export async function getSynopsisSummarization(data) {
  const prompt = `Summarize this anime synopsis for anime guessing without using specific names, be precise and informative. Synopsis: ${data?.synopsis}`;

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


