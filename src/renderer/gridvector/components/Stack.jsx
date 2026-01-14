import { useState } from "react";
import "./Stack.css";

export default function Stack({
    randomRotation = false,
    sensitivity = 200,
    cardDimensions = { width: 208, height: 208 },
    cardsData = [],
    sendToBackOnClick = false,
}) {
    const [cards, setCards] = useState(
        cardsData.length
            ? cardsData
            : []
    );

    const sendToBack = (id) => {
        setCards((prev) => {
            const newCards = [...prev];
            const index = newCards.findIndex((card) => card.id === id);
            const [card] = newCards.splice(index, 1);
            newCards.unshift(card);
            return newCards;
        });
    };

    return (
        <div
            className="gv-stack-container"
            style={{
                width: cardDimensions.width,
                height: cardDimensions.height,
                position: "relative",
            }}
        >
            {cards.slice(0, 5).map((card) => {
                const randomRotate = randomRotation ? Math.random() * 10 - 5 : 0;
                const rotateZ = randomRotate;

                return (
                    <div
                        key={card.id}
                        className="gv-stack-card"
                        onClick={() => sendToBackOnClick && sendToBack(card.id)}
                        style={{
                            position: "absolute",
                            width: cardDimensions.width,
                            height: cardDimensions.height,
                            transform: `rotateZ(${rotateZ}deg)`,
                            transformOrigin: "90% 90%",
                            cursor: sendToBackOnClick ? "pointer" : "default",
                            transition: "transform 0.3s ease",
                        }}
                    >
                        <img
                            src={card.img}
                            alt={`card-${card.id}`}
                            className="gv-card-image"
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                borderRadius: "8px",
                            }}
                        />
                    </div>
                );
            })}
        </div>
    );
}
