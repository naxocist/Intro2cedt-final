const base_url = "http://localhost:3001/api/"
const getRandomAnimeCluesFromUsername = async (username) => {

  if (!username) return null;

  const response = await fetch(`${base_url}/mal/${username}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  return data;
}

const updateUserScore = async (username, score) => {

}
