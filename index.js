var search_info = [];
var episodes = [];
var stop_searching = false;

function video_clips_info (video_clips) {
	const SEASON_REGEX = /(?<=(s|sezon)[^\w\d]*)\d+/gi;
	const EPISODE_REGEX = /(?<=(odc|odcinek|e|ep|0+|-|#)[^\w\d]*)\d+/gi;
	
	function season (title) {
		var match = title.match(SEASON_REGEX);
		if (match)
			return parseInt(match.pop());
		var ep_match = title.match(EPISODE_REGEX);
		if (ep_match) {
			var nums = title.match(/\d+/g).map(s => parseInt(s));
			var i = nums.lastIndexOf(parseInt(ep_match.pop())) - 1;
			if (i >= 0)
				return nums[i];
			return 1;
		}
		return null;
	}
	
	function episode (title) {
		var match = title.match(EPISODE_REGEX);
		if (match)
			return parseInt(match[0]);
		return null;
	}
	
	for (var i = 0; i < video_clips.length; i++) {
		var clip = video_clips[i];
		var title = clip.getElementsByClassName("link-title-visit")[0].innerHTML;
		search_info.push({
			"title": title,
			"link": "https://www.cda.pl/" + clip.getElementsByClassName("video-clip-link")[0].href.match(/video.*/)[0],
			"img": "https://" + clip.getElementsByClassName("video-clip-image")[0].src.match(/icdn.*/)[0],
			"desc": clip.parentNode.title,
			"season": season(title),
			"episode": episode(title)
		});
	}
}

function search_page (base_url, page) {
	if (stop_searching)
		return;
	var xhr = new XMLHttpRequest();
	var url = `${base_url}/p${page}?s=date`;
	xhr.open("GET", url);
	xhr.addEventListener("load", () => {
		if (xhr.status == 429) { // too many requests
			setTimeout(() => search_page(base_url, page), 70000);
			return;
		}
		else if (xhr.status != 404) { // not found
			var dom = new DOMParser().parseFromString(xhr.responseText, "text/html");
			let video_clips = dom.getElementsByClassName("video-clip");
			var numof_videos_to_load = parseInt(dom.getElementById("gora").getElementsByTagName("h2")[0].innerHTML.match(/\d+/g)[0]);
			var numof_pages = parseInt(Math.round(numof_videos_to_load/24)) + 1;
			video_clips_info(video_clips);
			$("#txt-info").html(`
				Strona ${page}/${numof_pages}
				<br>
				Wideo ${search_info.length}/${numof_videos_to_load}
				<br>
				${(search_info.length/numof_videos_to_load*100).toFixed(2)}%
			`);
			
			search_info = search_info.sort((a,b) => {
				if (a.season && b.season) {
					if (a.season == b.season) {
						if (a.episode && b.episode) {
							if (a.episode == b.episode)
								return (a.title.toLowerCase().includes("napisy")) ? -1 : 1;
							return a.episode - b.episode
						}
						return (a.episode) ? -1 : 1;
					}
					return a.season - b.season;
				}
				return (a.season) ? -1 : 1;
			});
			$("#videos-table").html("");
			$("#sidebar").html('<a href="#top">Szukaj</a><br>');
			episodes = [];
			search_info.forEach(info => {
				if (!document.getElementById(`tb-videos-season${info.season}`)) {
					var name = info.season ? `Sezon ${info.season}` : "Inne";
					$("#sidebar").append(`<a href="#h-videos-season${info.season}">${name}</a><br>`)
					$("#videos-table").append(`<h1 id="h-videos-season${info.season}">${name}</h1>`);
					$("#videos-table").append(`<table id="tb-videos-season${info.season}" class="table">
						<tr>
							<th>Miniaturka</th>
							<th>Tytuł</th>
							<th>Odcinek</th>
							<th>Opis</th>
							<th></th>
						</tr>
					</table>`)
				}
				var put_ep_id = false;
				if (info.episode)
				if (!episodes.includes(info.episode)) {
					episodes.push(info.episode);
					put_ep_id = true;
				}
				$(`#tb-videos-season${info.season}`).append(`<tr>
					<td><a href="${info.link}" target="_blank"><img src="${info.img}"></a></td>
					<td><a href="${info.link}" target="_blank">${info.title}</a></td>
					<td ${put_ep_id ? ("id=tb-ep-"+info.episode) : ""}>${info.episode || "???"}</td>
					<td>${info.desc}</td>
					<td><button class="btn btn-warning" onclick="$('#video-embed').attr('src', 'https://ebd.cda.pl/700x440/${info.link.match(/(?<=\/)[^/]+$/g)[0]}'); window.location.href='#video-embed'">Oglądaj</button></td>
				</tr>`);
			});		
			$("#sidebar").append("<br>Odcinek<br>");
			episodes.forEach(ep => {
				$("#sidebar").append(`<a href="#tb-ep-${ep}">${ep}</a><br>`)
			});
			
			search_page(base_url, page + 1);
		}
		else {
			$("#spinner").hide();
		}
	});
	xhr.send();
}

function search (query) {
	var base_url = "https://www.cda.pl/video/show/" + encodeURIComponent(query.toLowerCase());
	console.log("Searching: \"" + query + '"');
	console.log("Base URL: " + base_url);
	search_info = [];
	episodes = [];
	stop_searching = false;
	search_page(base_url, 1);
}

$(document).ready(() => {
	$("#spinner").hide();
	$("#btn-search").click(() => {
		$("#spinner").show();
		$("#btn-stop").prop("disabled", false);
		search($("#inp-search").val());
	});
	$("#btn-stop").click(() => {
		$("#spinner").hide();
		$("#btn-stop").prop("disabled", true);
		stop_searching = true;
	});
	$("#inp-search").keypress(e => {
		if (e.key == "Enter") {
			$("#btn-search").click();
		}
	});
})