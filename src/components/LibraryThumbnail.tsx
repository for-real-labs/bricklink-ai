import { useEffect, useRef, useState } from "react";
import { Box } from "lucide-react";
import { partThumbnail } from "../scene/thumbnails";
export function LibraryThumbnail({
  id,
  category,
}: {
  id: string;
  category: string;
}) {
  const element = useRef<HTMLSpanElement>(null);
  const [image, setImage] = useState<string>();
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    let active = true;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      void partThumbnail(id)
        .then((url) => {
          if (active) setImage(url);
        })
        .catch(() => {});
    });
    if (element.current) observer.observe(element.current);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [id]);
  return (
    <span ref={element} className="library-part-symbol">
      {image ? (
        <img src={image} alt="" />
      ) : (
        <>
          <Box size={30} />
          <small>{category}</small>
        </>
      )}
    </span>
  );
}
