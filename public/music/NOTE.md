# Music

Five original tracks, played in numbered order, crossfading, looping
forever. Reorder by renaming files, never by a mapping table in code.

## Encoding

Sources were MP3 at 130 to 195 kbps, mixed. Encoded with a two pass
loudness normalise, a limiter, then AAC:

    loudnorm=I=-14:TP=-1.0:LRA=11:measured_*=...:linear=true
    alimiter=limit=0.5
    -vn -map_metadata -1 -c:a aac -b:a 112k -ar 44100 -ac 2
    -movflags +faststart

Why each part is there:

- Two pass loudnorm because the sources spanned 2.49 dB, and the worst
  adjacent step was 1.64 dB. In a crossfading playlist that is an
  audible drop mid fade. Spread is now 0.53 dB.
- The limiter because AAC reconstructs intersample peaks ABOVE whatever
  the PCM holds. Without it track 3 decoded to a peak of +3.91 dBFS on
  the left channel, from a source that peaked at -0.69. Measured by
  decoding to float and counting samples, not by a meter: loudnorm's
  own true peak reading was unreliable here and reported +5.83.
- -vn strips embedded album art. All five masters carried an mjpeg
  stream, which bloats the file and can break the container.
- +faststart puts the index before the audio so playback begins before
  the download finishes.

These sit about 4 dB below a streaming master. That headroom is
deliberate. Set the music gain constant higher rather than re-encoding.

This is already a second lossy pass. Do not re-encode these files. Go
back to the MP3 masters if a change is needed.

Total 12.13 MB, playlist 14:28.

## Do not commit the masters

Git history is permanent. Anything committed here is in every clone
forever, even after it is deleted.
