# Фёдор Горбунов · MyTwoBrain / Факт → Решение

Агентская разработка, рабочие инструменты человека и ИИ, архитектура процессов и данных.

## Два основных направления

### 01 · MyTwoBrain — рабочее место человека и ИИ

Диалог, документы, файлы, план, исполнители и проверки связаны одной задачей.
Человек видит материал рядом с разговором, может проверить результат и
продолжить работу с сохранённым контекстом.

**[Открыть интерактивное портфолио](https://consulfedor.github.io/time-series-core-showcase/)** ·
[Попробовать рабочее место](https://consulfedor.github.io/time-series-core-showcase/mytwobrain/workspace.html) ·
[Технический обзор](mytwobrain/README.md)

MyTwoBrain — развиваемая частная система, используемая автором в собственной
работе. Здесь опубликованы реальные экраны с подготовленным публичным содержанием,
технический обзор и интерактивный учебный интерфейс. Исходный код харнеса остаётся
частным; макет не обращается к моделям или частной инфраструктуре.

### 02 · C1 «Факт → Решение» — внедрение ИИ в строительной компании

От документа и чертежа — к проверяемому расчёту и обоснованному поручению.
Один пример фундаментной плиты связывает 3D, DXF, график, план/факт объёмов,
стоимость, поставки и изменения проектных оснований.

**[Открыть строительный C1](https://consulfedor.github.io/time-series-core-showcase/fact-to-decision/)** ·
[Скачать автономную HTML-презентацию](fact-to-decision/index.html)

Это концепция внедрения и интерактивная демонстрация. Корпоративное внедрение,
его сроки и измеренный экономический эффект не заявляются.

## Прикладные примеры

| Пример | Что можно посмотреть |
|---|---|
| [Поток данных и восстановление](examples/data-pipeline.html) | HTML-кейс: путь данных, интерактивный пример пропуска и реальный экран покрытия истории |
| [Аналитика с участием человека](examples/analytics.md) | Событие, расчёт, исследовательская версия и подтверждение результата |
| [Invisible Rabbit Farm](https://consulfedor.github.io/invisible-rabbit-farm/) | Самостоятельный интерактивный прототип объяснимых оценок по косвенным сигналам; [исходники](https://github.com/consulfedor/invisible-rabbit-farm) |

## Что я делаю

Перевожу рабочую задачу в требования и понятный сценарий, организую агентскую
разработку, связываю данные и интерфейсы, проверяю результат. В портфолио показаны
и рабочая среда, и способы применить этот опыт к процессам компании.

Контакт: [consulfedor@gmail.com](mailto:consulfedor@gmail.com)

## English summary

**MyTwoBrain** is my private human–AI engineering workspace: a conversation next
to documents, files, plans, agents and verification results. The public demo
shows the interaction with fictional data; it does not connect to the private
system or an LLM. See the [technical guide](mytwobrain/README.md).

**Fact → Decision** is a construction-company AI adoption concept. Its interactive
foundation example connects a drawing, 3D model, quantities, schedule, cost,
deliveries and an evidence-backed decision package. It is a proposal and demo,
not a claim of a completed enterprise deployment.

## Repository and local preview

This repository is the public portfolio surface, not a mirror of private
implementation code. It contains the website, public explanations and approved
demonstrations. No dependencies or build are required for the website:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open `http://127.0.0.1:8080/`. The workspace demo also opens as a local HTML file.
The C1 presentation is a self-contained generated artifact; its provenance is
recorded in [the release manifest](release.json). Research drafts, personal
conversations and original screenshots stay outside this repository.
