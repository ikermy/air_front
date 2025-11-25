import TextArea from "antd/es/input/TextArea";
import {Alert, Button} from "antd";
import {getWidgetCode} from "../getWidget";
import {validateAndRefreshToken} from "../../../../utils/easyUtils";

export const WidgetSection = ({
                         channel,
                         selectedChannels,
                         setSelectedChannels,
                     }) => {
    const fetchDataAsync = async () => {
        try {
            const token = await validateAndRefreshToken(localStorage.getItem("authToken"));
            if (token) {
                const widgetCode = await getWidgetCode(token);

                setSelectedChannels(
                    selectedChannels.map((ch) =>
                        ch.key === "widg"
                            ? { ...ch, data: widgetCode }
                            : ch
                    )
                );
            } else {
                console.error("Ошибка: токен недействителен");
            }
        } catch (error) {
            console.error("Ошибка при загрузке данных:", error);
        }
    };

    const openIntegrationGuide = () => {
        const url = `/widget-integration.html${channel.data ? `?examKey=${encodeURIComponent(channel.data)}` : ''}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="padding">
            <Alert
                className="channel-alert"
                message={channel.data ? "Добавьте виджет себе на сайт" : "Получите HTML код виджета"}
                description={channel.data ?
                    <>
                        Всё готово для добавления виджета на сайт. Посмотрите наше
                         руководство с примерами кастомизации и интеграции виджета.
                    </>
                    :
                    <>
                        Для получения кода виджета, нажмите кнопку получить код.
                    </>
                }
                type={channel.data ? "success" : "warning"}
            />

            {channel.data ?
                <Button
                style={{ color: "black" }}
                type="primary"
                onClick={openIntegrationGuide}
            >
                Примеры интеграции виджета
            </Button> :
                <Button
                style={{ color: "black" }}
                type="primary"
                disabled={channel.data}
                onClick={fetchDataAsync}
            >
                Получить код
            </Button>}

            {channel.data && (
                <TextArea
                    value={channel.data}
                    readOnly
                    autoSize={{ minRows: 1, maxRows: 20 }}
                />
            )}
        </div>
    );
};
