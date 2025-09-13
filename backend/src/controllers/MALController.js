export const getRandomAnimeCluesByUsername = async (req, res) => {
  try {
    const MAL_API_BASE = process.env.MAL_API_BASE;
    const username = req.params.username;

    const headers = {
      "X-MAL-CLIENT-ID": process.env.MAL_CLIENT_ID,
      "Content-Type": "application/json"
    };

    // Fetch user's anime list
    const listResponse = await fetch(`${MAL_API_BASE}/users/${username}/animelist?limit=1000&nsfw=true`, {
      method: "GET",
      headers
    });

    const listData = await listResponse.json();

    if (listData.error) {
      throw new Error(listData.error);
    }

    const animeList = listData.data;
    const randomIdx = Math.floor(animeList.length * Math.random());
    const animeId = animeList[randomIdx].node.id;

    const fields = "fields=id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,num_list_users,num_scoring_users,nsfw,created_at,updated_at,media_type,status,genres,my_list_status,num_episodes,start_season,broadcast,source,average_episode_duration,rating,pictures,background,related_anime,related_manga,recommendations,studios,statistics";

    // Fetch selected anime details
    const animeResponse = await fetch(`${MAL_API_BASE}/anime/${animeId}?${fields}`, {
      method: "GET",
      headers
    });

    const animeData = await animeResponse.json();

    // Create clues (async because of AI summarization)
    const clues = await createCluesByData(animeData);

    res.status(200).json(clues);

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};


async function createCluesByData(data) {
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


async function getSynopsisSummarization(data) {
  const prompt = `Summarize this anime synopsis for anime guessing without using specific names, be precise and informative. Synopsis: ${data?.synopsis}`;

  try {
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

