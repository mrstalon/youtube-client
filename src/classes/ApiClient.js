import apiConfig from '../config/config';
import Video from './Video';

class ApiClient {
    constructor(videosLimit) {
        this.basicUrl = 'https://www.googleapis.com/youtube/v3/';
        this.requestMethod = 'GET';
        this.apiKey = apiConfig.key;
        this.chunkLength = videosLimit;
        this.order = 'viewCount';
        this.nextPageToken = undefined;
        this.searchQuery = undefined;
    }

    setNextPageToken(nextPageToken) {
        this.nextPageToken = nextPageToken;
    }

    setChunkLength(newLength) {
        this.chunkLength = newLength;
    }

    resetSearchQuery(newSearchQuery) {
        this.searchQuery = newSearchQuery;
        this.nextPageToken = undefined;
    }

    formUrlToRequestListOfVideos() {
        let urlToReturn = `${this.basicUrl}search?type=video&key=${this.apiKey}&order=${this.order}&maxResults=${this.chunkLength}&q=${this.searchQuery}&part=snippet`;

        if (this.nextPageToken) {
            urlToReturn = `${urlToReturn}&pageToken=${this.nextPageToken}`;
        }
        return urlToReturn;
    }

    formUrlToRequestVideoStatistics(arrayOfVideoId) {
        return `${this.basicUrl}videos?key=${this.apiKey}&id=${arrayOfVideoId.join(',')}&part=snippet,statistics`;
    }

    getNewChunkOfVideos() {
        return new Promise((resolve) => {
            const request = new XMLHttpRequest();
            request.open(this.requestMethod, this.formUrlToRequestListOfVideos(), true);
            request.onload = () => {
                const response = JSON.parse(request.response);
                this.setNextPageToken(response.nextPageToken);
                resolve(this.getVideoStatistics(response.items));
            };

            request.send();
        });
    }

    getVideoStatistics(arrayOfVideoId) {
        const request = new XMLHttpRequest();
        request.open(this.requestMethod, this.formUrlToRequestVideoStatistics(arrayOfVideoId.map((item) => {
            return item.id.videoId;
        })), false);
        request.send();

        if (request.status !== 200) {
            return false;
        }
        const response = JSON.parse(request.response);
        return response.items.map((item, id) => {
            return new Video(item.snippet.title,
                item.snippet.thumbnails.high.url,
                item.snippet.description,
                item.snippet.channelTitle,
                item.snippet.publishedAt.split('').splice(0, 10).join(''),
                item.statistics.viewCount,
                arrayOfVideoId[id].id.videoId);
        });
    }
}

const apiClient = new ApiClient(16);

export default apiClient;
