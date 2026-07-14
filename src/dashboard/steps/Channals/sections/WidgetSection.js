import TextArea from "antd/es/input/TextArea";
import {Alert, Button} from "antd";
import {getWidgetCode} from "../chUtils";
import {useTranslation} from "react-i18next";

// Токен теперь валидируется/обновляется внутри утилит (withTokenRefresh). Компонент берёт текущий токен из localStorage.

export const WidgetSection = ({
                                  channel,
                                  selectedChannels,
                                  setSelectedChannels,
                              }) => {
    const {t} = useTranslation();

    const fetchDataAsync = async () => {
        try {
            const widgetCode = await getWidgetCode();

            setSelectedChannels(
                selectedChannels.map((ch) =>
                    ch.key === "widg"
                        ? {...ch, data: widgetCode}
                        : ch
                )
            );
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
                message={channel.data ? (t("widgetAddToSite") || "Добавьте виджет себе на сайт") : (t("widgetGetCode") || "Получите HTML код виджета")}
                description={channel.data ?
                    <>
                        {t("widgetReadyDesc") || "Всё готово для добавления виджета на сайт. Посмотрите наше руководство с примерами кастомизации и интеграции виджета."}
                    </>
                    :
                    <>
                        {t("widgetGetCodeDesc") || "Для получения кода виджета, нажмите кнопку получить код."}
                    </>
                }
                type={channel.data ? "success" : "warning"}
            />

            {channel.data ?
                <Button
                    style={{color: "black"}}
                    type="primary"
                    onClick={openIntegrationGuide}
                >
                    {t("widgetIntegrationButton") || "Примеры интеграции виджета"}
                </Button> :
                <Button
                    style={{color: "black"}}
                    type="primary"
                    disabled={channel.data}
                    onClick={fetchDataAsync}
                >
                    {t("widgetGetCodeButton") || "Получить код"}
                </Button>}

            {channel.data && (
                <TextArea
                    value={channel.data}
                    readOnly
                    autoSize={{minRows: 1, maxRows: 20}}
                />
            )}
        </div>
    );
};
