import apiClient from './ApiClient';

class DomWorker {
    constructor(videosContainerId, sliderId, loadingCircleId) {
        this.content = [];
        this.chunksOfData = [];
        this.videosCountPerPage = 4;
        this.videosToHideOrShowCount = undefined;
        this.prevWindowWidth = undefined;
        this.currentLeftVideoContainerId = null;
        this.videosContainerDomId = videosContainerId;
        this.sliderDomId = sliderId;
        this.loadingCircleDomId = loadingCircleId;
        this.resizeAction = undefined;
        this.lastVideoId = 0;
        this.x0 = null;
        this.tempId = null;
        this.currentSlide = {
            id: 0,
            value: 1,
        };
        this.isRequesting = false;
        this.fullScreenWidth = 1200;
        this.mediumScreenWidth = 650;
    }

    initializeVideoSearchEvents() {
        const input = document.getElementById('search-bar');
        const searchButton = document.getElementById('search-button');

        searchButton.addEventListener('click', () => {
            if (this.isRequesting) {
                return;
            }

            this.showLoadingCircle();
            apiClient.resetSearchQuery(input.value);
            this.isRequesting = true;
            apiClient.getNewChunkOfVideos()
                .then((videos) => {
                    this.addNewChunkOfData(videos);
                    this.initializeWindow(window.innerWidth);
                    this.showNavPanel();
                    this.hideLoadingCircle();
                    this.isRequesting = false;
                });
            this.clearVideosContainerState();
        });
        this.initializeDomEvents();
    }

    initializeWindow(newWindowWidth) {
        this.changeVideosCountPerPage(newWindowWidth, true);
        this.buildContentAccordingToVideosPerPageCount();
        this.appendContentToThePage();
        this.prevWidth = newWindowWidth;
    }

    clearVideosContainerState() {
        const container = document.getElementById(this.videosContainerDomId);
        const slides = document.getElementById(this.sliderDomId);

        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        [].slice.call(slides.children).forEach((slide) => {
            slide.innerText = '';
        });
        slides.children[0].innerText = '1';

        this.currentLeftVideoContainerId = null;
        this.resizeAction = undefined;
        this.lastVideoId = 0;
        this.x0 = null;
        this.tempId = null;
        this.currentSlide = {
            id: 0,
            value: 1,
        };
        container.style.removeProperty('--i');
    }

    initializeDomEvents() {
        this.initializeSwipeEvents();
        this.initializeSliderEvents();

        window.addEventListener('resize', () => {
            this.resizeWindow(window.innerWidth);
        });
    }

    initializeSwipeEvents() {
        const container = document.getElementById(this.videosContainerDomId);

        container.style.setProperty('--n', container.children.length);

        container.addEventListener('mousedown', this.lockSlide.bind(this), false);
        container.addEventListener('touchstart', this.lockSlide.bind(this), false);

        container.addEventListener('mouseup', this.moveSlide.bind(this), false);
        container.addEventListener('touchend', this.moveSlide.bind(this), false);

        container.addEventListener('touchmove', (e) => { e.preventDefault(); }, false);
    }

    initializeSliderEvents() {
        const container = document.getElementById(this.videosContainerDomId);
        const slideLeft = document.getElementById('slide-left');
        const slideRight = document.getElementById('slide-right');
        const slider = document.getElementById(this.sliderDomId);
        const slides = [].slice.call(document.getElementById(this.sliderDomId).children);
        this.hideNavPanel();

        slider.addEventListener('mouseover', () => {
            const currentSlideId = slides.findIndex((slide) => { return Number(slide.innerHTML) === Number(this.currentSlide.value); });
            const startValue = this.currentSlide.value - currentSlideId;

            slides.forEach((slide, index) => {
                slide.innerHTML = `${startValue + index}`;
            });
            this.tempId = currentSlideId;
        });

        slider.addEventListener('mouseout', () => {
            slides.forEach((slide) => {
                slide.innerHTML = '';
            });
            slides[this.tempId].innerHTML = `${this.currentSlide.value}`;
        });

        slideLeft.addEventListener('click', () => {
            if (this.currentSlide.id <= 0) {
                return;
            }
            this.setCurrentSlideId(this.currentSlide.value - 1);
            this.currentSlide.id -= 1;
            this.currentSlide.value = this.currentSlide.id + 1;
            container.style.setProperty('--i', this.currentSlide.id);
            this.currentLeftVideoContainerId = container.children[this.currentSlide.id].children[0].id;
        });

        slideRight.addEventListener('click', () => {
            if (this.currentSlide.id >= container.children.length - 1) {
                return;
            }
            this.setCurrentSlideId(this.currentSlide.value + 1);
            this.currentSlide.id += 1;
            this.currentSlide.value = this.currentSlide.id + 1;
            container.style.setProperty('--i', this.currentSlide.id);
            this.currentLeftVideoContainerId = container.children[this.currentSlide.id].children[0].id;


            if (container.children.length - this.currentSlide.id <= 3) {
                this.showLoadingCircle();
                this.getNextVideos();
            }
        });
    }

    moveSlide(e) {
        const container = document.getElementById(this.videosContainerDomId);
        const containerLength = container.children.length;

        if (this.x0 || this.x0 === 0) {
            const dx = unify(e).clientX - this.x0;
            const s = Math.sign(dx);

            if ((this.currentSlide.value - 1 > 0 || s < 0) && (this.currentSlide.value - 1 < containerLength - 1 || s > 0)) {
                this.setCurrentSlideId(this.currentSlide.id - s + 1);
                this.currentSlide.id -= s;
                this.currentSlide.value = this.currentSlide.id + 1;
                container.style.setProperty('--i', this.currentSlide.id);
                this.currentLeftVideoContainerId = container.children[this.currentSlide.id].children[0].id;

                if (container.children.length - this.currentSlide.id <= 3) {
                    this.showLoadingCircle();
                    this.getNextVideos();
                }
            }

            this.x0 = null;
        }

        function unify() {
            return e.changedTouches ? e.changedTouches[0] : e;
        }
    }

    lockSlide(e) {
        this.x0 = unify(e).clientX;

        function unify() {
            return e.changedTouches ? e.changedTouches[0] : e;
        }
    }

    setCurrentSlideId(newValue) {
        const container = document.getElementById(this.videosContainerDomId);
        const slides = [].slice.call(document.getElementById(this.sliderDomId).children);
        const prevId = this.currentSlide.id;
        const prevValue = this.currentSlide.value;
        const directionOfSliding = prevValue > newValue ? -1 : 1;
        // if directionOfSliding === 1, then we are moving to the right
        // otherwise if directionOfSliding === -1, we are moving to the left


        clearAllSlideCircles();
        if (directionOfSliding === 1) {
            if (prevId + 1 >= 2 && prevId >= 2) {
                if (newValue === container.children.length) {
                    slides[3].innerHTML = `${newValue}`;
                    return;
                }
                slides[2].innerHTML = `${newValue}`;
                return;
            }
            slides[prevId + 1].innerHTML = `${newValue}`;
            return;
        }
        if (prevId - 1 <= 0 && prevId <= 0) {
            slides[0].innerHTML = `${newValue}`;
            return;
        }
        if (prevId > 3) {
            slides[2].innerHTML = `${newValue}`;
            return;
        }
        slides[prevId - 1].innerHTML = `${newValue}`;


        function clearAllSlideCircles() {
            slides.forEach((slide) => {
                slide.innerText = '';
            });
        }
    }

    getNextVideos() {
        if (this.isRequesting) {
            return;
        }
        this.isRequesting = true;
        apiClient.getNewChunkOfVideos()
            .then((videos) => {
                this.addNewChunkOfData(videos);
                this.buildContentAccordingToVideosPerPageCount();
                this.appendContentToThePage();
                this.hideLoadingCircle();
                this.isRequesting = false;
            });
    }

    addNewChunkOfData(newChunk) {
        this.chunksOfData = this.chunksOfData.concat(newChunk).map((video) => {
            const idToSet = this.lastVideoId;
            this.lastVideoId += 1;


            return {
                ...video,
                id: idToSet,
            };
        });
    }

    hideNavPanel() {
        document.getElementById('nav-panel-container').style.display = 'none';
    }

    showNavPanel() {
        document.getElementById('nav-panel-container').style.display = 'flex';
    }

    showLoadingCircle() {
        document.getElementById(this.loadingCircleDomId).style.display = 'inline-block';
        document.body.style.pointerEvents = 'none';
    }

    hideLoadingCircle() {
        document.getElementById(this.loadingCircleDomId).style.display = 'none';
        document.body.style.pointerEvents = 'initial';
    }

    buildContentAccordingToVideosPerPageCount() {
        let addedVideos = 0;
        let currentId = 0;
        this.chunksOfData.forEach((video) => {
            if (addedVideos === 0) {
                this.content.push([]);
            }
            if (addedVideos === this.videosCountPerPage) {
                this.content.push([]);
                currentId += 1;
                addedVideos = 0;
            }
            if (addedVideos < this.videosCountPerPage) {
                this.content[currentId].push(video);
                addedVideos += 1;
            }
        });
    }

    appendContentToThePage() {
        const container = document.getElementById(this.videosContainerDomId);


        this.content.forEach((pieceOfContent) => {
            const parentDiv = document.createElement('div');
            parentDiv.classList.add('slide-container');

            pieceOfContent.forEach((video) => {
                const videoContainer = document.createElement('div');
                videoContainer.classList.add('video');
                videoContainer.id = video.id;

                const img = document.createElement('img');
                img.setAttribute('src', video.imgUrl);

                const link = document.createElement('a');
                link.innerHTML = `${video.title}`;
                link.setAttribute('href', `https://www.youtube.com/watch?v=${video.videoId}`);
                link.setAttribute('target', '_blank');

                const authorContainer = document.createElement('div');
                authorContainer.classList.add('line-info-container');
                const authorIcon = document.createElement('img');
                authorIcon.setAttribute('src', './dist/author.png');
                const author = document.createElement('h3');
                author.innerHTML = `${video.author}`;
                authorContainer.appendChild(authorIcon);
                authorContainer.appendChild(author);

                const dateContainer = document.createElement('div');
                dateContainer.classList.add('line-info-container');
                const dateIcon = document.createElement('img');
                dateIcon.setAttribute('src', './dist/assets/calendar.png');
                const date = document.createElement('h3');
                date.innerHTML = `${video.publicationDate}`;
                dateContainer.appendChild(dateIcon);
                dateContainer.appendChild(date);


                const viewsContainer = document.createElement('div');
                viewsContainer.classList.add('line-info-container');
                const viewsIcon = document.createElement('img');
                viewsIcon.setAttribute('src', './dist/assets/views.png');
                const viewsRate = document.createElement('h3');
                viewsRate.innerHTML = `${video.viewCount}`;
                viewsContainer.appendChild(viewsIcon);
                viewsContainer.appendChild(viewsRate);

                const description = document.createElement('p');
                description.innerHTML = `${video.description.slice(0, 130)}`;

                videoContainer.appendChild(img);
                videoContainer.appendChild(link);
                videoContainer.appendChild(authorContainer);
                videoContainer.appendChild(dateContainer);
                videoContainer.appendChild(viewsContainer);
                videoContainer.appendChild(description);

                parentDiv.appendChild(videoContainer);
            });

            container.appendChild(parentDiv);
            container.style.transition = 'none';
            container.style.setProperty('--n', container.children.length);
            this.chunksOfData = [];
            this.content = [];
            setTimeout(() => {
                container.style.transition = 'transform .5s ease-out';
            }, 0);
        });
    }

    changeVideosCountPerPage(newWindowWidth, isInitial = false) {
        const getVideosCountAccordingToWidth = (width) => {
            if (width <= this.fullScreenWidth && width > this.mediumScreenWidth) {
                return 2;
            } else if (width <= this.mediumScreenWidth) {
                return 1;
            }
            return 4;
        };

        if (isInitial) {
            this.videosCountPerPage = getVideosCountAccordingToWidth(newWindowWidth);
            this.prevWindowWidth = newWindowWidth;
            return;
        }

        const isDirectionOfResizingIsLeft = newWindowWidth < this.prevWindowWidth;

        if (isDirectionOfResizingIsLeft) {
            const prevVideosCount = getVideosCountAccordingToWidth(this.prevWindowWidth);
            const newVideosCount = getVideosCountAccordingToWidth(newWindowWidth);
            const videosToHideOrShowCount = prevVideosCount - newVideosCount;
            this.videosToHideOrShowCount = videosToHideOrShowCount < 0 ? -videosToHideOrShowCount : videosToHideOrShowCount;
            this.resizeAction = 'hide';
            this.videosCountPerPage = this.videosCountPerPage - this.videosToHideOrShowCount;
        } else {
            const prevVideosCount = getVideosCountAccordingToWidth(this.prevWindowWidth);
            const newVideosCount = getVideosCountAccordingToWidth(newWindowWidth);
            const videosToHideOrShowCount = prevVideosCount - newVideosCount;
            this.videosToHideOrShowCount = videosToHideOrShowCount < 0 ? -videosToHideOrShowCount : videosToHideOrShowCount;
            this.resizeAction = 'add';
            this.videosCountPerPage = this.videosCountPerPage + this.videosToHideOrShowCount;
        }

        this.prevWindowWidth = newWindowWidth;
    }

    rebuildConentLeftResize() {
        const videosContainers = document.getElementById(this.videosContainerDomId);
        const videosContainersArray = [].slice.call(videosContainers.children);


        videosContainersArray.forEach((videoContainer, id) => {
            const videos = [].slice.call(videoContainer.children);

            const tempContainer = this.videosToHideOrShowCount === 3 ? [] : document.createElement('div');

            if (this.videosToHideOrShowCount === 3) {
                for (let i = 0; i < this.videosToHideOrShowCount; i++) {
                    const innerTempContainer = document.createElement('div');
                    innerTempContainer.classList.add('slide-container');
                    innerTempContainer.appendChild(videos[videos.length - i - 1]);
                    tempContainer.push(innerTempContainer);
                }
            } else {
                for (let i = 0; i < this.videosToHideOrShowCount; i++) {
                    tempContainer.appendChild(videos[videos.length - i - 1]);
                }
                tempContainer.classList.add('slide-container');
            }

            if (this.videosToHideOrShowCount === 3) {
                tempContainer.forEach((container) => {
                    videosContainers.insertBefore(container, videosContainers[id]);
                });
            } else {
                const containerToInsertId = id + 1 < videosContainers.children.length ? id + 1 : videosContainers.children.length;
                videosContainers.insertBefore(tempContainer, videosContainers.children[containerToInsertId]);
            }
        });
        videosContainers.style.setProperty('--n', videosContainers.children.length);
    }

    rebuildConentRightResize() {
        const videosContainers = document.getElementById(this.videosContainerDomId);
        const videosContainersArray = [].slice.call(videosContainers.children);


        if (this.videosToHideOrShowCount === 3) {
            for (let id = 0; id < videosContainersArray.length; id++) {
                if (videosContainersArray[id + 1] === undefined
                  && videosContainersArray[id + 2] === undefined
                  && videosContainersArray[id + 3] === undefined) {
                    return;
                }

                for (let i = 0; i < 3; i++) {
                    videosContainersArray[id].appendChild(videosContainersArray[id + 1].children[0]);
                    videosContainers.removeChild(videosContainersArray[id + 1]);
                    videosContainersArray.splice(id + 1, 1);
                }
            }
        } else {
            for (let id = 0; id < videosContainersArray.length; id++) {
                if (videosContainersArray[id + 1] === undefined) {
                    return;
                }

                const videos = [].slice.call(videosContainersArray[id + 1].children);
                videos.forEach((video) => {
                    videosContainersArray[id].appendChild(video);
                });


                videosContainers.removeChild(videosContainersArray[id + 1]);
                videosContainersArray.splice(id + 1, 1);
            }
        }


        videosContainers.style.setProperty('--n', videosContainers.children.length);
    }

    setCurrentSlideAccordingToCurrentVideoBeforeResize() {
        const videosContainers = document.getElementById(this.videosContainerDomId);
        const videosContainersArray = [].slice.call(videosContainers.children);

        const slides = [].slice.call(document.getElementById(this.sliderDomId).children);
        const choosedSliderId = slides.findIndex((slide) => { return slide.innerText.length > 0; });


        videosContainersArray.forEach((videoContainer, id) => {
            [].slice.call(videoContainer.children).forEach((video) => {
                if (video.id === this.currentLeftVideoContainerId) {
                    videosContainers.style.setProperty('--i', id);
                    this.currentSlide.id = id;
                    this.currentSlide.value = id + 1;
                    this.currentLeftVideoContainerId = videosContainers.children[this.currentSlide.id].children[0].id;

                    clearAllSlideCircles();
                    if (id === 0) {
                        slides[0].innerText = `${1}`;
                    } else if (id + 1 === videosContainers.children.length) {
                        slides[3].innerText = `${this.currentSlide.value}`;
                    } else if (choosedSliderId === 3 && id + 1 < videosContainers.children.length) {
                        slides[2].innerText = `${this.currentSlide.value}`;
                    } else if (id > 3) {
                        slides[2].innerText = `${this.currentSlide.value}`;
                    } else {
                        slides[id].innerText = `${this.currentSlide.value}`;
                    }
                }
            });
        });

        function clearAllSlideCircles() {
            slides.forEach((slide) => {
                slide.innerText = '';
            });
        }
    }

    resizeWindow(newWindowWidth) {
        const prevVideosCout = this.videosCountPerPage;
        this.changeVideosCountPerPage(newWindowWidth);
        if (prevVideosCout === this.videosCountPerPage) {
            return;
        }

        this.buildContentAccordingToVideosPerPageCount();

        if (this.resizeAction === 'hide') {
            this.rebuildConentLeftResize();
        } else {
            this.rebuildConentRightResize();
        }

        this.setCurrentSlideAccordingToCurrentVideoBeforeResize();
    }
}

const domWorker = new DomWorker('videos-container', 'slides-nav-container', 'loading-circle');

export default domWorker;
