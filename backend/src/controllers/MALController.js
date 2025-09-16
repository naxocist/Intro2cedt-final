import { createCluesByData } from "../utils.js"

export const getRandomAnimeCluesByUsername = async (req, res) => {
  try {
    const MAL_API_BASE = process.env.MAL_API_BASE;
    const username = req.params.username;

    const headers = {
      "X-MAL-CLIENT-ID": process.env.MAL_CLIENT_ID,
      "Content-Type": "application/json"
    };

    // Fetch user's anime list by specified MAL account
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

    const clues = await createCluesByData(animeData);
    res.status(200).json(clues);

  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
};


