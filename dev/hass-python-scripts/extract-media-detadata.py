prefix = 'http://192.168.5.2:8123/media/local'
# media_content_id = 'http://192.168.5.2:8123/media/local/video/tv-shows/Better%20Call%20Saul/Season%201/Episode%2001.mkv?authSig=eysomething'
media_content_id = data.get(media_content_id, "")
postfix_index = media_content_id.find('?')
path = media_content_id[0:postfix_index].replace(prefix, '')
decoded = path.replace('%20', ' ')


filename = decoded.split('/')[-1]
episode = filename.split('.')[0] # assumes no dot inside the episode name
season = decoded.split('/')[-2]
show = decoded.split('/')[-3]
is_tv_show = decoded.split('/')[-4] == 'tv-shows'

# output = {}
output["episode"] = episode
output["season"] = season
output["show"] = show
output["is-tv-show"] = is_tv_show
